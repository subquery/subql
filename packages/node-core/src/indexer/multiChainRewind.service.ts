// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Inject, Injectable, OnApplicationShutdown} from '@nestjs/common';
import {hashName} from '@subql/utils';
import {Transaction, Sequelize} from '@subql/x-sequelize';
import {Connection} from '@subql/x-sequelize/types/dialects/abstract/connection-manager';
import {uniqueId} from 'lodash';
import {Notification, PoolClient} from 'pg';
import {IBlockchainService} from '../blockchain.service';
import {NodeConfig} from '../configure';
import {createRewindTrigger, createRewindTriggerFunction, getTriggers} from '../db';
import {MultiChainRewindEvent} from '../events';
import {getLogger} from '../logger';
import {mainThreadOnly} from '../utils';
import {MultiChainRewindStatus} from './entities';
import {StoreService} from './store.service';
import {PlainGlobalModel} from './storeModelProvider/global/global';
import {Header} from './types';

const logger = getLogger('MultiChainRewindService');

/**
 * Working principle:
 * multiChainRewindService is primarily responsible for coordinating multi-chain projects.
 * When global.rewindLock changes, a PG trigger sends a notification, and all subscribed chain projects will receive the rollback notification.
 * This triggers a rollback process, where the fetch service handles the message by clearing the queue.
 * During the next fillNextBlockBuffer loop, if it detects the rewinding state, it will execute the rollback.
 */
@Injectable()
export class MultiChainRewindService implements OnApplicationShutdown {
  private _shutdown = false;
  private _status: MultiChainRewindStatus = MultiChainRewindStatus.Normal;
  private _chainId?: string;
  private dbSchema: string;
  private rewindTriggerName: string;
  private startHeight = 0;
  private pgListener?: PoolClient;
  private _globalModel?: PlainGlobalModel = undefined;
  private processingPromise: Promise<void> = Promise.resolve();
  waitRewindHeader?: Header;
  constructor(
    private nodeConfig: NodeConfig,
    private sequelize: Sequelize,
    private storeService: StoreService,
    @Inject('IBlockchainService') private readonly blockchainService: IBlockchainService
  ) {
    this.dbSchema = this.nodeConfig.dbSchema;
    this.rewindTriggerName = hashName(this.dbSchema, 'rewind_trigger', '_global');
  }

  get chainId(): string {
    assert(this._chainId, 'chainId is not set');
    return this._chainId;
  }

  private set status(status: MultiChainRewindStatus) {
    this._status = status;
  }

  get status(): MultiChainRewindStatus {
    assert(this._status, 'status is not set');
    return this._status;
  }

  get globalModel(): PlainGlobalModel {
    if (!this._globalModel) {
      this._globalModel = new PlainGlobalModel(this.dbSchema, this.chainId, this.storeService.globalDataRepo);
    }
    return this._globalModel;
  }

  async onApplicationShutdown(): Promise<void> {
    this._shutdown = true;
    await this.processingPromise;
    if (this.pgListener) {
      this.sequelize.connectionManager.releaseConnection(this.pgListener as Connection);
      this.pgListener = undefined;
    }
  }

  @mainThreadOnly()
  async init(chainId: string, reindex?: (targetHeader: Header) => Promise<void>): Promise<Header | undefined> {
    this._chainId = chainId;

    if (reindex === undefined) {
      // When using the reindex command, this parameter is not required.
      return;
    }
    if (!this.storeService.isMultichain) return;

    await this.sequelize.query(`${createRewindTriggerFunction(this.dbSchema)}`);
    const rewindTriggers = await getTriggers(this.sequelize, this.rewindTriggerName);
    if (rewindTriggers.length === 0) {
      await this.sequelize.query(`${createRewindTrigger(this.dbSchema)}`);
    }

    const startHeight = await this.storeService.modelProvider.metadata.find('startHeight');
    assert(startHeight !== undefined, 'startHeight is not set');
    this.startHeight = startHeight;

    // Register a listener and create a schema notification sending function.
    await this.registerPgListener();

    if (this.waitRewindHeader) {
      const rewindHeader = {...this.waitRewindHeader};
      await reindex(rewindHeader);
      return rewindHeader;
    }
  }

  private async registerPgListener() {
    if (this.pgListener) return;

    // Creating a new pgClient is to avoid using the same database connection as the block scheduler,
    // which may prevent real-time listening to rollback events.
    this.pgListener = (await this.sequelize.connectionManager.getConnection({
      type: 'read',
    })) as PoolClient;

    this.pgListener.on('notification', this.notifyHandle.bind(this));

    await this.pgListener.query(`LISTEN "${this.rewindTriggerName}"`);
    logger.info(`Register rewind listener success, chainId: ${this.chainId}`);

    // Check whether the current state is in rollback.
    // If a global lock situation occurs, prioritize setting it to the WaitOtherChain state. If a rollback is still required, then set it to the rewinding state.
    const chainRewindInfo = await this.globalModel.getChainRewindInfo();
    if (!chainRewindInfo) return;

    if (chainRewindInfo.status === MultiChainRewindStatus.Complete) {
      this.status = MultiChainRewindStatus.Complete;
    }
    if (chainRewindInfo.status === MultiChainRewindStatus.Incomplete) {
      this.status = MultiChainRewindStatus.Incomplete;
      this.waitRewindHeader = await this.searchWaitRewindHeader(chainRewindInfo.rewindTimestamp);
    }
  }

  private notifyHandle(msg: Notification) {
    this.processingPromise = this.processingPromise.then(async () => {
      // We're shutdown but still receiving messages, so we ignore them.
      if (this._shutdown) return;
      assert(msg.payload, 'Payload is empty');
      const {chainId, event: eventType} = JSON.parse(msg.payload) as {chainId: string; event: MultiChainRewindEvent};
      if (chainId !== this.chainId) return;

      const sessionUuid = uniqueId();
      logger.info(`[${sessionUuid}]Received rewind event: ${eventType}, chainId: ${this.chainId}`);
      switch (eventType) {
        case MultiChainRewindEvent.Rewind:
        case MultiChainRewindEvent.RewindTimestampDecreased: {
          const chainRewindInfo = await this.globalModel.getChainRewindInfo();
          assert(chainRewindInfo, `Not registered rewind timestamp in global data, chainId: ${this.chainId}`);

          await this.setStatus(MultiChainRewindStatus.Incomplete, chainRewindInfo.rewindTimestamp);
          break;
        }
        case MultiChainRewindEvent.RewindComplete:
          await this.setStatus(MultiChainRewindStatus.Complete);
          break;
        case MultiChainRewindEvent.FullyRewind:
          await this.setStatus(MultiChainRewindStatus.Normal);
          break;
        default:
          throw new Error(`Unknown rewind event: ${eventType}`);
      }
      logger.info(`[${sessionUuid}]Handle success rewind event: ${eventType}, chainId: ${this.chainId}`);
    });
  }

  private async searchWaitRewindHeader(rewindTimestamp: Date): Promise<Header> {
    const rewindBlockHeader = await this.getHeaderByBinarySearch(rewindTimestamp);
    // The blockHeader.timestamp obtained from the query cannot be used directly, as it will cause an infinite loop.
    // Different chains have timestamp discrepancies, which will result in infinite backward tracing.
    return {...rewindBlockHeader, timestamp: rewindTimestamp};
  }

  /**
   * If the set rewindTimestamp is greater than or equal to the current blockHeight, we do nothing because we will roll back to an earlier time.
   * If the set rewindTimestamp is less than the current blockHeight, we should roll back to the earlier rewindTimestamp.
   * @param rewindTimestamp rewindTimestamp in milliseconds
   */
  @mainThreadOnly()
  async acquireGlobalRewindLock(rewindTimestamp: Date): Promise<boolean> {
    const {lockTimestamp} = await this.globalModel.acquireGlobalRewindLock(rewindTimestamp);

    const existEarlierLock = lockTimestamp < rewindTimestamp;
    if (!existEarlierLock) {
      logger.info(`setGlobalRewindLock success chainId: ${this.chainId}, rewindTimestamp: ${rewindTimestamp}`);
    }
    return !existEarlierLock;
  }

  @mainThreadOnly()
  /**
   * Check if the height is consistent before unlocking.
   * @param tx
   * @param rewindTimestamp The timestamp to roll back to.
   * @param allowRewindTimestamp Set a rewind-allowed height; only heights greater than or equal this can be released.
   * @returns the number of remaining rewind chains
   */
  async releaseChainRewindLock(tx: Transaction, rewindTimestamp: Date, allowRewindTimestamp?: Date): Promise<number> {
    const chainsCount = await this.globalModel.releaseChainRewindLock(tx, rewindTimestamp, allowRewindTimestamp);
    // The current chain has completed the rewind, and we still need to wait for other chains to finish.
    // When fully synchronized, set the status back to normal by pgListener.
    await this.setStatus(MultiChainRewindStatus.Complete);
    logger.info(`Rewind success chainId: ${JSON.stringify({chainsCount, chainId: this.chainId, rewindTimestamp})}`);
    return chainsCount;
  }

  private async setStatus(status: MultiChainRewindStatus, rewindTimestamp?: Date) {
    if (status === MultiChainRewindStatus.Incomplete) {
      assert(rewindTimestamp, 'rewindTimestamp is not set');
      this.status = MultiChainRewindStatus.Incomplete;
      this.waitRewindHeader = await this.searchWaitRewindHeader(rewindTimestamp);
    } else {
      this.status = status;
      this.waitRewindHeader = undefined;
    }
  }

  /**
   * Get the block header closest to the given timestamp
   * @param timestamp To find the block closest to a given timestamp
   * @returns
   */
  private async getHeaderByBinarySearch(timestamp: Header['timestamp']): Promise<Header> {
    let left = this.startHeight;
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

    const targetHeader = await this.blockchainService.getHeaderForHeight(left);
    logger.info(`Binary search times: ${searchNum}, target Header: ${JSON.stringify(targetHeader)}`);

    return targetHeader;
  }
}
