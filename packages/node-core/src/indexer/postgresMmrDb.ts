// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Db} from '@subql/x-merkle-mountain-range';
import {Sequelize, DataTypes, Model, ModelStatic} from 'sequelize';

const LEAF_LENGTH_INDEX = -1;

interface NodeMap {
  [key: string]: Buffer;
}

interface MMRIndexValueStoreAttributes {
  key: number;
  value: Buffer;
}

class MMRIndexValueStoreInstance extends Model<MMRIndexValueStoreAttributes> implements MMRIndexValueStoreAttributes {
  key!: number;
  value!: Buffer;
}

export class PgBasedMMRDB implements Db {
  private sequelize;
  private mmrIndexValueStore: ModelStatic<MMRIndexValueStoreInstance>;

  constructor(sequelize: Sequelize, schema: string) {
    this.sequelize = sequelize;
    this.mmrIndexValueStore = this.initMMRIndexValueStoreModel(this.sequelize, schema);
  }

  private initMMRIndexValueStoreModel(sequelize: Sequelize, schema: string): ModelStatic<MMRIndexValueStoreInstance> {
    MMRIndexValueStoreInstance.init(
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
        sequelize,
        modelName: '_mmr',
        schema: schema,
        freezeTableName: true,
      }
    );
    return MMRIndexValueStoreInstance;
  }

  async connect() {
    try {
      await this.mmrIndexValueStore.sync();
    } catch (error) {
      throw new Error(`Failed to create MMR database: ${error}`);
    }
  }

  async get(key: number) {
    try {
      const record = await this.mmrIndexValueStore.findByPk(key);
      return record ? record.value : null;
    } catch (error) {
      throw new Error(`Failed to get MMR node ${key}: ${error}`);
    }
  }

  async set(value: any, key: number) {
    if (value === null || value === undefined) {
      throw new Error('Cannot set a null or undefined value');
    }

    try {
      await this.mmrIndexValueStore.upsert({key, value});
    } catch (error) {
      throw new Error(`Failed to store MMR Node: ${error}`);
    }
  }

  async delete(key: string) {
    try {
      await this.mmrIndexValueStore.destroy({where: {key}});
    } catch (error) {
      throw new Error(`Failed to delete MMR node: ${error}`);
    }
  }

  async getNodes(): Promise<NodeMap> {
    try {
      const nodes = await this.mmrIndexValueStore.findAll<MMRIndexValueStoreInstance>();
      const nodeMap: NodeMap = {};
      nodes.forEach((node) => {
        nodeMap[node.key] = node.value;
      });
      return nodeMap;
    } catch (error) {
      throw new Error(`Failed to get MMR nodes: ${error}`);
    }
  }

  async getLeafLength() {
    try {
      const record = await this.mmrIndexValueStore.findByPk(LEAF_LENGTH_INDEX);
      return record ? record.value.readUInt32BE(0) : 0;
    } catch (error) {
      throw new Error(`Failed to get leaf length for MMR: ${error}`);
    }
  }

  async setLeafLength(leafLength: number): Promise<number> {
    try {
      const leafLengthBuffer = Buffer.alloc(4);
      leafLengthBuffer.writeUInt32BE(leafLength, 0);
      await this.mmrIndexValueStore.upsert({key: LEAF_LENGTH_INDEX, value: leafLengthBuffer});
      return leafLength;
    } catch (error) {
      throw new Error(`Failed to set leaf length for MMR: ${error}`);
    }
  }
}
