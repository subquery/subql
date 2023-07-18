// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BuildOptions, DataTypes, Model, Sequelize} from '@subql/x-sequelize';

export interface ProofOfIndex {
  id: number; //blockHeight
  chainBlockHash: Uint8Array;
  hash: Uint8Array;
  parentHash?: Uint8Array;
  operationHashRoot: Uint8Array;
  mmrRoot?: Uint8Array;
  projectId?: string;
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
      mmrRoot: {
        type: DataTypes.BLOB,
        allowNull: true,
        unique: true,
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
      mmrRoot: {
        type: DataTypes.BLOB,
        allowNull: true,
        unique: true,
      },
    },
    {
      freezeTableName: true,
      schema: schema,
      indexes: [{fields: ['hash']}],
    }
  );
}
