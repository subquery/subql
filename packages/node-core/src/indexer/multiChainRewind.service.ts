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
import {createRewindTrigger, createRewindTriggerFunction, getPgPoolConfig, getTriggers} from '../db';
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

const logger = getLogger('MultiChainRewindService');

export enum RewindStatus {
  /** The current chain is in normal state. */
  Normal = 'normal',
  /** The current chain is waiting for other chains to rewind. */
  WaitOtherChain = 'waitOtherChain',
  /** The current chain is executing rewind. */
  Rewinding = 'rewinding',
}
export interface IMultiChainRewindService {
  chainId: string;
  status: RewindStatus;
  waitRewindHeader?: Header;
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

/**
 * Working principle:
 * multiChainRewindService is primarily responsible for coordinating multi-chain projects.
 * When global.rewindLock changes, a PG trigger sends a notification, and all subscribed chain projects will receive the rollback notification.
 * This triggers a rollback process, where the fetch service handles the message by clearing the queue.
 * During the next fillNextBlockBuffer loop, if it detects the rewinding state, it will execute the rollback.
 */
@Injectable()
export class MultiChainRewindService implements IMultiChainRewindService, OnApplicationShutdown {
  private _status: RewindStatus = RewindStatus.Normal;
  private _chainId?: string;
  private _dbSchema?: string;
  private _rewindTriggerName?: string;
  private pgListener?: PoolClient;
  waitRewindHeader?: Header;
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

  private get dbSchema(): string {
    assert(this._dbSchema, 'dbSchema is not set');
    return this._dbSchema;
  }

  private set dbSchema(dbSchema: string) {
    this._dbSchema = dbSchema;
  }
  private set rewindTriggerName(rewindTriggerName: string) {
    this._rewindTriggerName = rewindTriggerName;
  }

  private get rewindTriggerName(): string {
    assert(this._rewindTriggerName, 'rewindTriggerName is not set');
    return this._rewindTriggerName;
  }

  private set status(status: RewindStatus) {
    this._status = status;
  }

  get status() {
    assert(this._status, 'status is not set');
    return this._status;
  }

  onApplicationShutdown() {
    this.pgListener?.release();
  }

  async init(chainId: string, dbSchema: string, reindex: (targetHeader: Header) => Promise<void>) {
    this.chainId = chainId;
    this.dbSchema = dbSchema;
    this.rewindTriggerName = hashName(this.dbSchema, 'rewind_trigger', '_global');

    if (this.nodeConfig.multiChain) {
      await this.sequelize.query(`${createRewindTriggerFunction(this.dbSchema)}`);

      const rewindTriggers = await getTriggers(this.sequelize, this.rewindTriggerName);
      if (rewindTriggers.length === 0) {
        await this.sequelize.query(`${createRewindTrigger(this.dbSchema)}`);
      }

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
    this.pgListener = (await this.sequelize.connectionManager.getConnection({
      type: 'read',
    })) as PoolClient;

    this.pgListener.on('notification', (msg) => {
      Promise.resolve().then(async () => {
        const eventType = msg.payload;
        logger.info(`Received rewind event: ${eventType}, chainId: ${this.chainId}`);
        switch (eventType) {
          case MultiChainRewindEvent.Rewind:
          case MultiChainRewindEvent.RewindTimestampDecreased: {
            const {rewindTimestamp} = await this.getGlobalRewindStatus();
            this.waitRewindHeader = await this.searchWaitRewindHeader(rewindTimestamp);
            this.status = RewindStatus.Rewinding;

            // Trigger the rewind event, and let the fetchService listen to the message and handle the queueFlush.
            this.eventEmitter.emit(eventType, {
              height: this.waitRewindHeader.blockHeight,
            } satisfies MultiChainRewindPayload);
            break;
          }
          case MultiChainRewindEvent.RewindComplete:
            // recover indexing status
            this.waitRewindHeader = undefined;
            this.status = RewindStatus.Normal;
            break;
          default:
            throw new Error(`Unknown rewind event: ${eventType}`);
        }
        logger.info(`Handle success rewind event: ${eventType}, chainId: ${this.chainId}`);
      });
    });

    await this.pgListener.query(`LISTEN "${this.rewindTriggerName}"`);
    logger.info(`Register rewind listener success, chainId: ${this.chainId}`);

    // Check whether the current state is in rollback.
    // If a global lock situation occurs, prioritize setting it to the WaitOtherChain state. If a rollback is still required, then set it to the rewinding state.
    const {rewindLock, rewindTimestamp} = await this.getGlobalRewindStatus();
    if (rewindLock) {
      this.status = RewindStatus.WaitOtherChain;
    }
    if (rewindTimestamp) {
      this.status = RewindStatus.Rewinding;
      this.waitRewindHeader = await this.searchWaitRewindHeader(rewindTimestamp);
    }
  }

  private async searchWaitRewindHeader(rewindTimestamp: number): Promise<Header> {
    const rewindDate = dayjs(rewindTimestamp).toDate();
    const rewindBlockHeader = await this.getHeaderByBinarySearch(rewindDate);
    // The blockHeader.timestamp obtained from the query cannot be used directly, as it will cause an infinite loop.
    // Different chains have timestamp discrepancies, which will result in infinite backward tracing.
    return {...rewindBlockHeader, timestamp: rewindDate};
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
        WHERE "${globalTable}"."key" = '${RewindLockKey}' AND ("${globalTable}"."value"->>'timestamp')::BIGINT > ${rewindTimestamp}`,
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
        to_jsonb(COALESCE(("${globalTable}"."value" ->> 'chainNum')::BIGINT, 0) - 1), 
        false
      )
      WHERE "${globalTable}"."key" = '${RewindLockKey}' AND ("${globalTable}"."value"->>'timestamp')::BIGINT = ${rewindTimestamp}
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
    const chainNum = results[0].value.chainNum;

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

    if (chainNum === 0) {
      await this.storeService.globalDataRepo.destroy({where: {key: RewindLockKey}, transaction: tx});
    }

    // The current chain has completed the rewind, and we still need to wait for other chains to finish.
    // When fully synchronized, set the status back to normal by pgListener.
    this.status = RewindStatus.WaitOtherChain;
    logger.info(`Rewind success chainId: ${JSON.stringify({chainNum, chainId: this.chainId, rewindTimestamp})}`);
    return chainNum;
  }

  /**
   * Get the block header closest to the given timestamp
   * @param timestamp To find the block closest to a given timestamp
   * @returns
   */
  async getHeaderByBinarySearch(timestamp: Header['timestamp']): Promise<Required<Header>> {
    assert(timestamp, 'getHeaderByBinarySearch `timestamp` is required');

    let left = 0;
    let {height: right} = await this.storeService.getLastProcessedBlock();
    let searchNum = 0;
    while (left < right) {
      searchNum++;
      const mid = Math.floor((left + right) / 2);
      const header = await this.blockchainService.getRequiredHeaderForHeight(mid);

      if (header.timestamp === timestamp) {
        return header;
      } else if (header.timestamp < timestamp) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    const targetHeader = left
      ? await this.blockchainService.getRequiredHeaderForHeight(left)
      : {
          blockHash: '',
          blockHeight: 0,
          parentHash: '',
          timestamp,
        };
    logger.info(`Binary search times: ${searchNum}, target Header: ${JSON.stringify(targetHeader)}`);

    return targetHeader;
  }
}
