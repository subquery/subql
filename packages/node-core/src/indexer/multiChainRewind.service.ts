// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Inject, Injectable, OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {hashName} from '@subql/utils';
import {Transaction, Op, QueryTypes, Sequelize} from '@subql/x-sequelize';
import dayjs from 'dayjs';
import {Pool, PoolClient} from 'pg';
import {IBlockchainService} from '../blockchain.service';
import {NodeConfig} from '../configure';
import {getPgPoolConfig} from '../db';
import {MultiChainRewindEvent, MultiChainRewindPayload} from '../events';
import {getLogger} from '../logger';
import {
  generateRewindTimestampKey,
  GlobalData,
  GlobalDataKeys,
  RewindLockInfo,
  RewindLockKey,
  RewindTimestampKey,
  RewindTimestampKeyPrefix,
} from './entities';
import {StoreService} from './store.service';
import {Header} from './types';

const logger = getLogger('RewindService');

export enum RewindStatus {
  /** The current chain is in normal state. */
  Normal = 'normal',
  /** The current chain is waiting for other chains to rewind. */
  WaitOtherChain = 'waitOtherChain',
  /** The current chain is executing rewind. */
  Rewinding = 'rewinding',
}
interface IMultiChainRewindService {
  chainId: string;
  dbSchema: string;
  getStatus(): RewindStatus;
  getGlobalRewindStatus(): Promise<{
    rewindTimestamp: GlobalDataKeys[RewindTimestampKey];
    rewindLock?: GlobalDataKeys[typeof RewindLockKey];
  }>;
  setGlobalRewindLock(rewindTimestamp: number): Promise<void>;
  /**
   * Check if the height is consistent before unlocking.
   * @param tx
   * @param rewindTimestamp The timestamp to roll back to, in milliseconds.
   * @returns the number of remaining rewind chains
   */
  releaseChainRewindLock(tx: Transaction, rewindTimestamp: number): Promise<number>;
}

export interface IMultiChainHandler {
  handleMultiChainRewindEvent(rewindBlockPayload: MultiChainRewindPayload): void;
}

@Injectable()
export class MultiChainRewindService implements IMultiChainRewindService, OnApplicationShutdown {
  private _status: RewindStatus = RewindStatus.Normal;
  private _chainId?: string;
  private _dbSchema?: string;
  waitRewindHeader?: Header;
  private pgListener?: PoolClient;
  constructor(
    private nodeConfig: NodeConfig,
    private eventEmitter: EventEmitter2,
    private sequelize: Sequelize,
    private storeService: StoreService,
    @Inject('IBlockchainService') private readonly blockchainService: IBlockchainService
  ) {}

  private set chainId(chainId: string) {
    this._chainId = chainId;
  }

  get chainId(): string {
    assert(this._chainId, 'chainId is not set');
    return this._chainId;
  }

  get dbSchema(): string {
    assert(this._dbSchema, 'dbSchema is not set');
    return this._dbSchema;
  }

  private set dbSchema(dbSchema: string) {
    this._dbSchema = dbSchema;
  }

  private set status(status: RewindStatus) {
    this._status = status;
  }

  getStatus(): RewindStatus {
    return this._status;
  }

  onApplicationShutdown() {
    this.pgListener?.release();
  }

  async init(chainId: string, dbSchema: string, reindex: (targetHeader: Header) => Promise<void>) {
    this.chainId = chainId;
    this.dbSchema = dbSchema;

    if (this.storeService.historical === 'timestamp') {
      // Register a listener and create a schema notification sending function.
      await this.registerPgListener();

      if (this.waitRewindHeader) {
        const rewindHeader = {...this.waitRewindHeader};
        await reindex(rewindHeader);
        return rewindHeader;
      }
    }
  }

  private async registerPgListener() {
    if (this.pgListener) return;

    // Creating a new pgClient is to avoid using the same database connection as the block scheduler,
    // which may prevent real-time listening to rollback events.
    const pgPool = new Pool(getPgPoolConfig(this.nodeConfig));
    this.pgListener = await pgPool.connect();

    this.pgListener.on('notification', (msg) => {
      Promise.resolve().then(async () => {
        const eventType = msg.payload;
        logger.info(`Received rewind event: ${eventType}, chainId: ${this.chainId}`);
        switch (eventType) {
          case MultiChainRewindEvent.Rewind:
          case MultiChainRewindEvent.RewindTimestampDecreased: {
            this.status = RewindStatus.Rewinding;
            const {rewindTimestamp} = await this.getGlobalRewindStatus();
            this.waitRewindHeader = await this.getHeaderByBinarySearch(dayjs(rewindTimestamp).toDate());

            // Trigger the rewind event, and let the fetchService listen to the message and handle the queueFlush.
            this.eventEmitter.emit(eventType, {
              height: this.waitRewindHeader.blockHeight,
            } satisfies MultiChainRewindPayload);
            break;
          }
          case MultiChainRewindEvent.RewindComplete:
            // recover indexing status
            this.status = RewindStatus.Normal;
            this.waitRewindHeader = undefined;
            break;
          default:
            throw new Error(`Unknown rewind event: ${eventType}`);
        }
        logger.info(`Handle success rewind event: ${eventType}, chainId: ${this.chainId}`);
      });
    });

    await this.pgListener.query(`LISTEN "${hashName(this.dbSchema, 'rewind_trigger', '_global')}"`);

    // Check whether the current state is in rollback.
    const {rewindLock, rewindTimestamp} = await this.getGlobalRewindStatus();
    if (rewindLock) {
      this.status = RewindStatus.WaitOtherChain;
    }
    if (rewindTimestamp) {
      this.status = RewindStatus.Rewinding;
      this.waitRewindHeader = await this.getHeaderByBinarySearch(dayjs(rewindTimestamp).toDate());
    }
  }

  /**
   * Serialize the rewind lock
   * @param rewindTimestamp ms
   * @param chainTotal The total number of registered chains.
   * @returns
   */
  private serializeRewindLock(rewindTimestamp: number, chainTotal: number): string {
    return JSON.stringify({timestamp: rewindTimestamp, chainNum: chainTotal});
  }

  async getGlobalRewindStatus() {
    const rewindTimestampKey = generateRewindTimestampKey(this.chainId);

    const records = await this.storeService.globalDataRepo.findAll({
      where: {key: {[Op.in]: [rewindTimestampKey, RewindLockKey]}},
    });
    const rewindLockInfo: GlobalData<typeof RewindLockKey> | undefined = records
      .find((r) => r.key === RewindLockKey)
      ?.toJSON();
    const rewindTimestampInfo: GlobalData<RewindTimestampKey> | undefined = records
      .find((r) => r.key === rewindTimestampKey)
      ?.toJSON();

    assert(
      rewindTimestampInfo !== undefined,
      `Not registered rewind timestamp key in global data, chainId: ${this.chainId}`
    );
    return {rewindTimestamp: rewindTimestampInfo.value, rewindLock: rewindLockInfo?.value};
  }

  /**
   * If the set rewindTimestamp is greater than or equal to the current blockHeight, we do nothing because we will roll back to an earlier time.
   * If the set rewindTimestamp is less than the current blockHeight, we should roll back to the earlier rewindTimestamp.
   * @param rewindTimestamp rewindTimestamp in milliseconds
   */
  async setGlobalRewindLock(rewindTimestamp: number) {
    const globalTable = this.storeService.globalDataRepo.tableName;
    const chainTotal = await this.storeService.globalDataRepo.count({
      where: {
        key: {[Op.like]: `${RewindTimestampKeyPrefix}_%`},
      },
    });

    const tx = await this.sequelize.transaction();
    try {
      const [_, updateRows] = await this.sequelize.query(
        `INSERT INTO "${this.dbSchema}"."${globalTable}" ( "key", "value", "createdAt", "updatedAt" )
        VALUES
        ( '${RewindLockKey}', '${this.serializeRewindLock(rewindTimestamp, chainTotal)}', now(), now()) 
        ON CONFLICT ( "key" ) 
        DO UPDATE 
        SET "key" = EXCLUDED."key",
            "value" = EXCLUDED."value",
            "updatedAt" = EXCLUDED."updatedAt" 
        WHERE "key" = '${RewindLockKey}' AND ("value"->>'timestamp')::int > ${rewindTimestamp}`,
        {
          type: QueryTypes.INSERT,
          transaction: tx,
        }
      );

      // If there is a rewind lock that is greater than the current rewind timestamp, we should not update the rewind timestamp
      if (updateRows === 1) {
        logger.info(`setGlobalRewindLock success chainId: ${this.chainId}, rewindTimestamp: ${rewindTimestamp}`);
        await this.storeService.globalDataRepo.update(
          {value: rewindTimestamp},
          {
            where: {key: {[Op.like]: 'rewindTimestamp_%'}},
            transaction: tx,
          }
        );

        // The current chain is in REWINDING state
        this.status = RewindStatus.Rewinding;
      }
      await tx.commit();
    } catch (e: any) {
      logger.error(
        `setGlobalRewindLock failed chainId: ${this.chainId}, rewindTimestamp: ${rewindTimestamp}, errorMsg: ${e.message}`
      );
      await tx.rollback();
      throw e;
    }
  }

  async releaseChainRewindLock(tx: Transaction, rewindTimestamp: number): Promise<number> {
    const globalTable = this.storeService.globalDataRepo.tableName;

    // Ensure the first write occurs and prevent deadlock, only update the rewindNum - 1
    const results = await this.sequelize.query<{value: RewindLockInfo}>(
      `UPDATE "${this.dbSchema}"."${globalTable}"
      SET value = jsonb_set(
        value, 
        '{chainNum}', 
        to_jsonb(COALESCE((value ->> 'chainNum')::int, 0) - 1), 
        false
      )
      WHERE "key" = '${RewindLockKey}' AND ("value"->>'timestamp')::int = ${rewindTimestamp}
      RETURNING value`,
      {
        type: QueryTypes.SELECT,
        transaction: tx,
      }
    );

    // not exist rewind lock in current timestamp
    if (results.length === 0) {
      logger.warn(
        `Release rewind lock failed chainId: ${this.chainId}, rewindTimestamp: ${rewindTimestamp}, the rewind lock does not exist`
      );
      return 0;
    }
    const rewindNum = results[0].value.rewindNum;

    const rewindTimestampKey = generateRewindTimestampKey(this.chainId);
    const [affectedCount] = await this.storeService.globalDataRepo.update(
      {value: 0},
      {
        where: {
          key: rewindTimestampKey,
          value: rewindTimestamp,
        },
        transaction: tx,
      }
    );
    assert(
      affectedCount === 1,
      `not found rewind timestamp key in global data, chainId: ${this.chainId}, rewindTimestamp: ${rewindTimestamp}`
    );

    if (rewindNum === 0) {
      await this.storeService.globalDataRepo.destroy({where: {key: RewindLockKey}, transaction: tx});
    }

    // The current chain has completed the rewind, and we still need to wait for other chains to finish.
    // When fully synchronized, set the status back to normal by pgListener.
    this.status = RewindStatus.WaitOtherChain;
    logger.info(`Rewind success chainId: ${JSON.stringify({rewindNum, chainId: this.chainId, rewindTimestamp})}`);
    return rewindNum;
  }

  /**
   * Get the block header closest to the given timestamp
   * @param timestamp To find the block closest to a given timestamp
   * @returns undefined if the timestamp is less than the first block timestamp
   */
  async getHeaderByBinarySearch(timestamp: Header['timestamp']): Promise<Header> {
    assert(timestamp, 'getHeaderByBinarySearch `timestamp` is required');

    let left = 0;
    let {height: right} = await this.storeService.getLastProcessedBlock();

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const header = await this.blockchainService.getHeaderForHeight(mid);
      assert(header.timestamp, 'getHeader return `timestamp` is undfined');

      if (header.timestamp === timestamp) {
        return header;
      } else if (header.timestamp < timestamp) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left ? this.blockchainService.getHeaderForHeight(left) : ({blockHeight: 0} as Header);
  }
}
