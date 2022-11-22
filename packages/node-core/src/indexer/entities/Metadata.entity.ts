// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getMetadataTableName} from '@subql/utils';
import {BuildOptions, DataTypes, Model, QueryTypes, Sequelize} from 'sequelize';

export interface MetadataKeys {
  chain: string;
  genesisHash: string;
  historicalStateEnabled: boolean;
  indexerNodeVersion: string;
  lastProcessedHeight: number;
  lastProcessedTimestamp: string;
  processedBlockCount: number;
  blockOffset: number;
  runnerNode: string;
  runnerNodeVersion: string;
  runnerQuery: string;
  runnerQueryVersion: string;
  specName: string;
  lastPoiHeight: number;
  lastFinalizedVerifiedHeight: number;
  indexerHealthy: boolean;
  targetHeight: number;
  dynamicDatasources: string;
  unfinalizedBlocks: string;
  schemaMigrationCount: number;
}

export interface Metadata {
  key: keyof MetadataKeys;
  value: MetadataKeys[keyof MetadataKeys];
}

export interface MetadataModel extends Model<Metadata>, Metadata {}

export type MetadataRepo = typeof Model & {
  new (values?: unknown, options?: BuildOptions): MetadataModel;
};

async function checkSchemaMetadata(sequelize: Sequelize, schema: string, chainId: string): Promise<boolean> {
  try {
    const res = await sequelize.query<Metadata>(`SELECT * FROM "${schema}"._metadata WHERE key = 'genesisHash'`, {
      type: QueryTypes.SELECT,
    });
    return res[0]?.value === chainId;
  } catch (e) {
    return false;
  }
}

export async function MetadataFactory(
  sequelize: Sequelize,
  schema: string,
  multichain: boolean,
  chainId: string
): Promise<MetadataRepo> {
  let tableName = '_metadata';

  if (multichain) {
    const singularMetadata = await checkSchemaMetadata(sequelize, schema, chainId);

    if (singularMetadata) {
      throw new Error(
        '"_metadata" entry found, for multichain project metadata must match _metadata_[chainId] syntax, please clear schema and reindex with --multichain.'
      );
    }

    tableName = getMetadataTableName(chainId);
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
