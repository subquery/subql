// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BuildOptions, DataTypes, Model, Sequelize } from 'sequelize';

export interface Metadata {
  key: string;
  value: string;
}

export interface MetadataModel extends Model<Metadata>, Metadata {}

export type MetadataRepo = typeof Model & {
  new (values?: unknown, options?: BuildOptions): MetadataModel;
};

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
