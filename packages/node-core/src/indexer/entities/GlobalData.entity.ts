// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BuildOptions, DataTypes, Model, Sequelize} from '@subql/x-sequelize';

export enum MultiChainRewindStatus {
  /** Indicates a normal state. Each chain needs to register before starting to sync blocks. */
  Normal = 'normal',
  /** The rewind task has been completed. The rollback height can be determined using rewindTimestamp. */
  Complete = 'complete',
  /** Unprocessed rewind task. The rollback height can be determined using rewindTimestamp. */
  Incomplete = 'incomplete',
  /** The current chain is executing rewind. */
  Rewinding = 'rewinding',
}

export interface GlobalData {
  chainId: string;
  rewindTimestamp: Date;
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
        type: DataTypes.DATE,
        defaultValue: new Date(0),
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
