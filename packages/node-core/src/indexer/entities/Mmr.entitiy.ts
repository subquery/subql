// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Db} from '@subql/x-merkle-mountain-range';
import {Sequelize, DataTypes, Model, ModelStatic, Transaction} from '@subql/x-sequelize';

const LEAF_LENGTH_INDEX = -1;

interface NodeMap {
  [key: string]: Buffer;
}

interface MMRIndexValueStoreAttributes {
  key: number;
  value: Buffer;
}

export interface MmrModel extends Model<MMRIndexValueStoreAttributes>, MMRIndexValueStoreAttributes {}
export class PgBasedMMRDB implements Db {
  private mmrIndexValueStore: ModelStatic<MmrModel>;

  constructor(sequelize: Sequelize, schema: string) {
    this.mmrIndexValueStore = sequelize.define(
      '_mmr',
      {
        key: {
          type: DataTypes.INTEGER,
          primaryKey: true,
        },
        value: {
          type: DataTypes.BLOB,
          allowNull: false,
        },
      },
      {
        schema,
        freezeTableName: true,
      }
    );
  }

  static async create(sequelize: Sequelize, schema: string): Promise<PgBasedMMRDB> {
    const postgresBasedDb = new PgBasedMMRDB(sequelize, schema);

    await postgresBasedDb.mmrIndexValueStore.sync();

    return postgresBasedDb;
  }

  async get(key: number): Promise<any | null> {
    try {
      const record = await this.mmrIndexValueStore.findByPk(key);
      return record ? record.value : null;
    } catch (error) {
      throw new Error(`Failed to get MMR node ${key}: ${error}`);
    }
  }

  async set(value: any, key: number, tx?: Transaction): Promise<void> {
    if (value === null || value === undefined) {
      throw new Error('Cannot set a null or undefined value');
    }

    try {
      await this.mmrIndexValueStore.upsert({key, value}, {transaction: tx});
    } catch (error) {
      throw new Error(`Failed to store MMR Node: ${error}`);
    }
  }

  async bulkSet(entries: Record<number, any>, tx: Transaction): Promise<void> {
    const data = Object.entries(entries).map(([key, value]) => {
      if (value === null || value === undefined) {
        throw new Error(`Cannot set a null or undefined value for key: ${key}`);
      }
      // Parse to work around Object.entries converting all keys to string
      return {key: parseInt(key, 10), value};
    });
    try {
      await this.mmrIndexValueStore.bulkCreate(data, {
        transaction: tx,
        updateOnDuplicate: ['value'],
      });
    } catch (error) {
      throw new Error(`Failed to bulk store MMR Node: ${error}`);
    }
  }

  async getNodes(): Promise<NodeMap> {
    try {
      const nodes = await this.mmrIndexValueStore.findAll();
      const nodeMap: NodeMap = {};
      nodes.forEach((node) => {
        nodeMap[node.key] = node.value;
      });
      return nodeMap;
    } catch (error) {
      throw new Error(`Failed to get MMR nodes: ${error}`);
    }
  }

  async getLeafLength(): Promise<number> {
    try {
      const record = await this.mmrIndexValueStore.findByPk(LEAF_LENGTH_INDEX);
      return record ? record.value.readUInt32BE(0) : 0;
    } catch (error) {
      throw new Error(`Failed to get leaf length for MMR: ${error}`);
    }
  }

  async setLeafLength(leafLength: number, tx?: Transaction): Promise<number> {
    try {
      const leafLengthBuffer = Buffer.alloc(4);
      leafLengthBuffer.writeUInt32BE(leafLength, 0);
      await this.mmrIndexValueStore.upsert({key: LEAF_LENGTH_INDEX, value: leafLengthBuffer}, {transaction: tx});
      return leafLength;
    } catch (error) {
      throw new Error(`Failed to set leaf length for MMR: ${error}`);
    }
  }
}
