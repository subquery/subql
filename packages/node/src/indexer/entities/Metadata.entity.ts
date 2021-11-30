// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BuildOptions, DataTypes, Model, Sequelize } from 'sequelize';

export interface Metadata {
  key: string;
  value: number | string | boolean;
}

export interface MetadataModel extends Model<Metadata>, Metadata {}

export type MetadataRepo = typeof Model & {
  new (values?: unknown, options?: BuildOptions): MetadataModel;
};

// XXX: In the future do not implement a key value store like this, give each key its own column.
// Sequelize does not support this as a repo/model if you want to fetch the entire store.
// This is a serious antipattern
export function MetadataFactory(
  sequelize: Sequelize,
  schema: string,
): MetadataRepo {
  return <MetadataRepo>sequelize.define(
    `_metadata`,
    {
      key: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      value: {
        type: DataTypes.JSONB,
      },
    },
    { freezeTableName: true, schema: schema },
  );
}
