// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {blake2AsHex} from '@subql/utils';
import {BuildOptions, DataTypes, Model, Sequelize} from '@subql/x-sequelize';

type RewindTimestampKey = `rewindTimestamp_${string}`;
export interface GlobalDataKeys {
  rewindLock: number;
  [key: RewindTimestampKey]: number;
}

export interface GlobalData {
  key: keyof GlobalDataKeys;
  value: GlobalDataKeys[keyof GlobalDataKeys];
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
      key: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      value: {
        type: DataTypes.JSONB,
      },
    },
    {freezeTableName: true, schema: schema}
  );
}

export function generateRewindTimestampKey(chainId: string): RewindTimestampKey {
  return `rewindTimestamp_${blake2AsHex(chainId)})`.substring(0, 63) as RewindTimestampKey;
}