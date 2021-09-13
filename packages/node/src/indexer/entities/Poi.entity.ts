// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BuildOptions, DataTypes, Model, Sequelize } from 'sequelize';

export interface ProofOfIndex {
  id: number; //blockHeight
  chainBlockHash: Uint8Array;
  hash: Uint8Array;
  parentHash?: Uint8Array;
  operationHashRoot: Uint8Array;
  mmrRoot: Uint8Array;
  projectId: string;
}

export interface PoiModel extends Model<ProofOfIndex>, ProofOfIndex {}

export type PoiRepo = typeof Model & {
  new (values?: unknown, options?: BuildOptions): PoiModel;
};

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
        allowNull: false,
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
      indexes: [{ fields: ['hash'] }],
    },
  );
}
