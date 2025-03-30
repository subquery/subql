// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {getLogger} from '@subql/node-core/logger';
import {Op, Sequelize, Transaction} from '@subql/x-sequelize';
import {GlobalData, GlobalDataRepo, MultiChainRewindStatus} from '../../entities';

export interface IGlobalData {
  getChainRewindInfo(): Promise<GlobalData>;

  setGlobalRewindLock(rewindTimestamp: number): Promise<{lockTimestamp: number}>;
  /**
   * Check if the height is consistent before unlocking.
   * @param tx
   * @param rewindTimestamp The timestamp to roll back to, in milliseconds.
   * @returns the number of remaining rewind chains
   */
  releaseChainRewindLock(tx: Transaction, rewindTimestamp: number): Promise<number>;
}

const logger = getLogger('PlainGlobalModel');

export class PlainGlobalModel implements IGlobalData {
  constructor(
    private readonly dbSchema: string,
    private readonly chainId: string,
    private readonly model: GlobalDataRepo
  ) {}

  private get sequelize(): Sequelize {
    const sequelize = this.model.sequelize;

    if (!sequelize) {
      throw new Error(`Sequelize is not available on ${this.model.name}`);
    }

    return sequelize;
  }

  async getChainRewindInfo(): Promise<GlobalData> {
    const rewindTimestampInfo = await this.model.findOne({
      where: {chainId: this.chainId},
    });

    assert(rewindTimestampInfo, `Not registered rewind timestamp key in global data, chainId: ${this.chainId}`);
    return rewindTimestampInfo;
  }

  /**
   * If the set rewindTimestamp is greater than or equal to the current blockHeight, we do nothing because we will roll back to an earlier time.
   * If the set rewindTimestamp is less than the current blockHeight, we should roll back to the earlier rewindTimestamp.
   * The reason for not using the external tx variable here is to complete the locking task as soon as possible and promptly send a notification to allow other chains to rewind.
   * @param rewindTimestamp
   * @param tx
   * @returns
   */
  async setGlobalRewindLock(rewindTimestamp: number): Promise<{lockTimestamp: number}> {
    const tx = await this.sequelize.transaction();
    const {chainsCount, currentChain} = await this.getChainsInfo(tx);

    try {
      let lockTimestamp = 0;
      const [affectedCount] = await this.model.update(
        {
          status: MultiChainRewindStatus.WaitRewind,
          rewindTimestamp,
          initiator: false,
        },
        {
          where: {
            [Op.or]: [{status: MultiChainRewindStatus.Normal}, {rewindTimestamp: {[Op.gt]: rewindTimestamp}}],
          },
          transaction: tx,
        }
      );

      assert(
        affectedCount === 0 || affectedCount === chainsCount,
        `Set global rewind lock failed, chainId: ${this.chainId}, rewindTimestamp: ${rewindTimestamp}`
      );

      if (affectedCount === chainsCount) {
        lockTimestamp = rewindTimestamp;
        await this.model.update({initiator: true}, {where: {chainId: this.chainId}, transaction: tx});
      }

      await tx.commit();
      return {lockTimestamp};
    } catch (e: any) {
      logger.error(
        `setGlobalRewindLock failed chainId: ${this.chainId}, rewindTimestamp: ${rewindTimestamp}, errorMsg: ${e.message}`
      );
      await tx.rollback();
      throw e;
    }
  }

  /**
   * The following special cases may exist:
   * 1.	A table lock needs to be added before release to prevent multiple chains from releasing simultaneously, causing a deadlock. If one chain is setting setGlobalRewindLock, others need to queue (so it’s necessary to check if it’s the lock for the current timestamp; if not, the release fails, and the rollback fails).
   * 2.	There may be a case where lastProcessBlock < rewindTime, in which case the lock should be released directly (force = true).
   * @param rewindTimestamp
   * @returns
   */
  async releaseChainRewindLock(tx: Transaction, rewindTimestamp: number, force = false): Promise<number> {
    // A table lock should be used here to prevent multiple chains from releasing simultaneously, causing a deadlock.
    const chainList = await this.model.findAll({transaction: tx, lock: tx.LOCK.UPDATE});
    const currentChainInfo = chainList.find((chain) => chain.chainId === this.chainId);
    const waitChainCount = chainList.filter((chain) => chain.status === MultiChainRewindStatus.WaitRewind).length;

    if (!force) {
      assert(currentChainInfo, `Not registered rewind timestamp key in global data, chainId: ${this.chainId}`);
      assert(
        currentChainInfo.status === MultiChainRewindStatus.WaitRewind &&
          currentChainInfo.rewindTimestamp === rewindTimestamp,
        `ChainRewindLock is not match, chainId: ${this.chainId}, rewindTimestamp: ${rewindTimestamp}, status: ${currentChainInfo.status}`
      );
    }

    const [affectedCount] = await this.model.update(
      {status: MultiChainRewindStatus.WaitOtherChain},
      {
        where: {
          chainId: this.chainId,
          status: MultiChainRewindStatus.WaitRewind,
        },
        transaction: tx,
      }
    );

    assert(affectedCount === 1, `Release chain rewind lock failed, chainId: ${this.chainId}`);

    if (waitChainCount - 1 === 0) {
      // Everything is complete, release the lock.
      await this.model.update(
        {status: MultiChainRewindStatus.Normal, rewindTimestamp: 0, initiator: false},
        {where: {status: MultiChainRewindStatus.WaitOtherChain}, transaction: tx}
      );
    }

    return waitChainCount - 1;
  }

  private async getChainsInfo(tx: Transaction) {
    const chainList = await this.model.findAll({transaction: tx, lock: tx.LOCK.UPDATE});
    const currentChain = chainList.find((chain) => chain.chainId === this.chainId);
    const waitChainCount = chainList.filter((chain) => chain.status === MultiChainRewindStatus.WaitRewind).length;
    return {currentChain, chainsCount: chainList.length, waitChainCount};
  }
}
