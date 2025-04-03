// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BuildOptions, DataTypes, Model, Sequelize} from '@subql/x-sequelize';

export enum MultiChainRewindStatus {
  /** The current chain is in normal state. */
  Normal = 'normal',
  /** The current chain is waiting for other chains to rewind. */
  WaitOtherChain = 'waitOtherChain',
  /** The current chain is executing rewind. */
  Rewinding = 'rewinding',
  /** The current chain is waiting for rewind. */
  WaitRewind = 'waitRewind',
}

export interface GlobalData {
  chainId: string;
  rewindTimestamp: number;
  status: MultiChainRewindStatus;
  initiator: boolean;
}

interface GlobalDataEntity extends Model<GlobalData>, GlobalData {}

export type GlobalDataRepo = typeof Model & {
  new (values?: unknown, options?: BuildOptions): GlobalDataEntity;
};

export function GlobalDataFactory(sequelize: Sequelize, schema: string): GlobalDataRepo {
  const tableName = '_global';

  return <GlobalDataRepo>sequelize.define(
    tableName,
    {
      chainId: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      rewindTimestamp: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        get() {
          return Number(this.getDataValue('rewindTimestamp'));
        },
      },
      status: {
        type: DataTypes.ENUM,
        values: Object.values(MultiChainRewindStatus),
        defaultValue: MultiChainRewindStatus.Normal,
      },
      initiator: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {freezeTableName: true, schema: schema}
  );
}
