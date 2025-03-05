// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Inject, Injectable, OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {hashName} from '@subql/utils';
import {Transaction, Sequelize} from '@subql/x-sequelize';
import dayjs from 'dayjs';
import {PoolClient} from 'pg';
import {IBlockchainService} from '../blockchain.service';
import {NodeConfig} from '../configure';
import {createRewindTrigger, createRewindTriggerFunction, getTriggers} from '../db';
import {MultiChainRewindEvent, MultiChainRewindPayload} from '../events';
import {getLogger} from '../logger';
import {StoreService} from './store.service';
import {PlainGlobalModel} from './storeModelProvider/global/global';
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
  private dbSchema: string;
  private rewindTriggerName: string;
  private pgListener?: PoolClient;
  private _globalModel?: PlainGlobalModel = undefined;
  waitRewindHeader?: Header;
  constructor(
    private nodeConfig: NodeConfig,
    private eventEmitter: EventEmitter2,
    private sequelize: Sequelize,
    private storeService: StoreService,
    @Inject('IBlockchainService') private readonly blockchainService: IBlockchainService
  ) {
    this.dbSchema = this.nodeConfig.dbSchema;
    this.rewindTriggerName = hashName(this.dbSchema, 'rewind_trigger', '_global');
  }

  private set chainId(chainId: string) {
    this._chainId = chainId;
  }

  get chainId(): string {
    assert(this._chainId, 'chainId is not set');
    return this._chainId;
  }

  private set status(status: RewindStatus) {
    this._status = status;
  }

  get status() {
    assert(this._status, 'status is not set');
    return this._status;
  }

  get globalModel() {
    if (!this._globalModel) {
      this._globalModel = new PlainGlobalModel(this.dbSchema, this.chainId, this.storeService.globalDataRepo);
    }
    return this._globalModel;
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
            const {rewindTimestamp} = await this.globalModel.getGlobalRewindStatus();
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
    const {rewindLock, rewindTimestamp} = await this.globalModel.getGlobalRewindStatus();
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
   * If the set rewindTimestamp is greater than or equal to the current blockHeight, we do nothing because we will roll back to an earlier time.
   * If the set rewindTimestamp is less than the current blockHeight, we should roll back to the earlier rewindTimestamp.
   * @param rewindTimestamp rewindTimestamp in milliseconds
   */
  async setGlobalRewindLock(rewindTimestamp: number) {
    const {needRewind} = await this.globalModel.setGlobalRewindLock(rewindTimestamp);
    if (needRewind) {
      logger.info(`setGlobalRewindLock success chainId: ${this.chainId}, rewindTimestamp: ${rewindTimestamp}`);
      this.status = RewindStatus.Rewinding;
    }
  }

  async releaseChainRewindLock(tx: Transaction, rewindTimestamp: number): Promise<number> {
    const chainNum = await this.globalModel.releaseChainRewindLock(tx, rewindTimestamp);
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
  private async getHeaderByBinarySearch(timestamp: Header['timestamp']): Promise<Required<Header>> {
    const startHeight = await this.storeService.modelProvider.metadata.find('startHeight');
    assert(startHeight !== undefined, 'startHeight is not set');

    let left = startHeight;
    let {height: right} = await this.storeService.getLastProcessedBlock();
    let searchNum = 0;
    while (left < right) {
      searchNum++;
      const mid = Math.floor((left + right) / 2);
      const header = await this.blockchainService.getHeaderForHeight(mid);

      if (header.timestamp === timestamp) {
        return header;
      } else if (header.timestamp < timestamp) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    const targetHeader = left
      ? await this.blockchainService.getHeaderForHeight(left)
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
