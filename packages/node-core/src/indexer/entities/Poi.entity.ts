// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BuildOptions, DataTypes, Model, Op, Sequelize} from '@subql/x-sequelize';

export interface ProofOfIndex {
  id: number; //blockHeight
  chainBlockHash: Uint8Array | null;
  hash: Uint8Array | undefined;
  parentHash: Uint8Array | undefined;
  operationHashRoot: Uint8Array | null;
  projectId?: string;
}

export interface SyncedProofOfIndex extends ProofOfIndex {
  hash: Uint8Array;
  parentHash: Uint8Array;
}

export interface PoiModel extends Model<ProofOfIndex>, ProofOfIndex {}

export type PoiRepo = typeof Model & {
  new (values?: unknown, options?: BuildOptions): PoiModel;
};
// Project Id is deprecated
export function PoiFactoryDeprecate(sequelize: Sequelize, schema: string): PoiRepo {
  return <PoiRepo>sequelize.define(
    `_poi`,
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      chainBlockHash: {
        type: DataTypes.BLOB,
        allowNull: false,
        unique: true,
      },
      hash: {
        type: DataTypes.BLOB,
        allowNull: false,
        unique: true,
      },
      parentHash: {
        type: DataTypes.BLOB,
        allowNull: false,
        unique: true,
      },
      operationHashRoot: {
        type: DataTypes.BLOB,
        allowNull: false,
      },
      projectId: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '0',
      },
    },
    {
      freezeTableName: true,
      schema: schema,
      indexes: [{fields: ['hash']}],
    }
  );
}

export function PoiFactory(sequelize: Sequelize, schema: string): PoiRepo {
  return <PoiRepo>sequelize.define(
    `_poi`,
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      chainBlockHash: {
        type: DataTypes.BLOB,
        allowNull: true,
        unique: true,
      },
      hash: {
        type: DataTypes.BLOB,
        allowNull: true,
        unique: true,
      },
      parentHash: {
        type: DataTypes.BLOB,
        allowNull: true,
        unique: true,
      },
      operationHashRoot: {
        type: DataTypes.BLOB,
        allowNull: true,
      },
    },
    {
      freezeTableName: true,
      schema: schema,
    }
  );
}
