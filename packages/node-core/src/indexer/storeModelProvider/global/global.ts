// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {getLogger} from '@subql/node-core/logger';
import {Op, QueryTypes, Sequelize, Transaction} from '@subql/x-sequelize';
import {
  generateRewindTimestampKey,
  GlobalData,
  GlobalDataKeys,
  GlobalDataRepo,
  RewindLockInfo,
  RewindLockKey,
  RewindTimestampKey,
  RewindTimestampKeyPrefix,
} from '../../entities';

export interface IGlobalData {
  getGlobalRewindStatus(): Promise<{
    rewindTimestamp: GlobalDataKeys[RewindTimestampKey];
    rewindLock?: GlobalDataKeys[typeof RewindLockKey];
  }>;

  setGlobalRewindLock(rewindTimestamp: number): Promise<{needRewind: boolean}>;
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

  /**
   * Serialize the rewind lock
   * @param rewindTimestamp ms
   * @param chainTotal The total number of registered chains.
   * @returns
   */
  private serializeRewindLock(rewindTimestamp: number, chainTotal: number): string {
    return JSON.stringify({timestamp: rewindTimestamp, chainsCount: chainTotal});
  }

  async getGlobalRewindStatus(): Promise<{
    rewindTimestamp: GlobalDataKeys[RewindTimestampKey];
    rewindLock?: GlobalDataKeys[typeof RewindLockKey];
  }> {
    const rewindTimestampKey = generateRewindTimestampKey(this.chainId);

    const records = await this.model.findAll({
      where: {key: {[Op.in]: [rewindTimestampKey, RewindLockKey]}},
    });
    const rewindLockInfo = records.find((r) => r.key === RewindLockKey)?.toJSON<GlobalData<typeof RewindLockKey>>();
    const rewindTimestampInfo = records
      .find((r) => r.key === rewindTimestampKey)
      ?.toJSON<GlobalData<RewindTimestampKey>>();

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
  async setGlobalRewindLock(rewindTimestamp: number): Promise<{needRewind: boolean}> {
    const globalTable = this.model.tableName;
    const chainTotal = await this.model.count({
      where: {
        key: {[Op.like]: `${RewindTimestampKeyPrefix}_%`},
      },
    });

    let needRewind = false;
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
        await this.model.update(
          {value: rewindTimestamp},
          {
            where: {key: {[Op.like]: 'rewindTimestamp_%'}},
            transaction: tx,
          }
        );

        // The current chain is in REWINDING state
        needRewind = true;
      }
      await tx.commit();
      return {needRewind};
    } catch (e: any) {
      logger.error(
        `setGlobalRewindLock failed chainId: ${this.chainId}, rewindTimestamp: ${rewindTimestamp}, errorMsg: ${e.message}`
      );
      await tx.rollback();
      throw e;
    }
  }

  async releaseChainRewindLock(tx: Transaction, rewindTimestamp: number): Promise<number> {
    const globalTable = this.model.tableName;

    // Ensure the first write occurs and prevent deadlock, only update the rewindNum - 1
    const results = await this.sequelize.query<{value: RewindLockInfo}>(
      `UPDATE "${this.dbSchema}"."${globalTable}"
      SET value = jsonb_set(
        value, 
        '{chainsCount}', 
        to_jsonb(COALESCE(("${globalTable}"."value" ->> 'chainsCount')::BIGINT, 0) - 1), 
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
      return 0;
    }
    const chainsCount = results[0].value.chainsCount;

    const rewindTimestampKey = generateRewindTimestampKey(this.chainId);
    const [affectedCount] = await this.model.update(
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

    if (chainsCount === 0) {
      await this.model.destroy({where: {key: RewindLockKey}, transaction: tx});
    }

    return chainsCount;
  }
}
