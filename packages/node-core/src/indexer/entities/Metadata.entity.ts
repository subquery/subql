// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BuildOptions, DataTypes, Model, QueryTypes, Sequelize} from 'sequelize';

export interface Metadata {
  key: string;
  value: number | string | boolean;
}

export interface MetadataModel extends Model<Metadata>, Metadata {}

export type MetadataRepo = typeof Model & {
  new (values?: unknown, options?: BuildOptions): MetadataModel;
};

async function checkSchemaMetadata(sequelize: Sequelize, dbSchema: string, chainId: string): Promise<boolean> {
  try {
    const r = await sequelize.query<Metadata>(`select * from "${dbSchema}"._metadata WHERE key = 'genesisHash'`, {
      type: QueryTypes.SELECT,
    });
    return r[0]?.value === chainId;
  } catch (e) {
    return false;
  }
}

export async function MetadataFactory(sequelize: Sequelize, schema: string, chainId: string): Promise<MetadataRepo> {
  let tableName = '_metadata';

  const oldMetadataName = await checkSchemaMetadata(sequelize, schema, chainId);

  if (!oldMetadataName) {
    const id = chainId.substring(0, 10);
    tableName = `${tableName}_${id}`;
  }

  return <MetadataRepo>sequelize.define(
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
