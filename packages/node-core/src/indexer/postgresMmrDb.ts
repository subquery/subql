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
      }
    );
    return MMRIndexValueStoreInstance;
  }

  async connect() {
    await this.mmrIndexValueStore.sync();
  }

  async get(key: number) {
    const record = await this.mmrIndexValueStore.findByPk(key);
    return record ? record.value : null;
  }

  async set(value: any, key: number) {
    if (value === null || value === undefined) {
      throw new Error('Cannot set a null or undefined value');
    }

    await this.mmrIndexValueStore.upsert({key, value});
  }

  async delete(key: string) {
    await this.mmrIndexValueStore.destroy({where: {key}});
  }

  async getNodes(): Promise<NodeMap> {
    const nodes = await this.mmrIndexValueStore.findAll<MMRIndexValueStoreInstance>();
    const nodeMap: NodeMap = {};
    nodes.forEach((node) => {
      nodeMap[node.key] = node.value;
    });
    return nodeMap;
  }

  async getLeafLength() {
    const record = await this.mmrIndexValueStore.findByPk(LEAF_LENGTH_INDEX);
    return record ? record.value.readUInt32BE(0) : 0;
  }

  async setLeafLength(leafLength: number): Promise<number> {
    const leafLengthBuffer = Buffer.alloc(4);
    leafLengthBuffer.writeUInt32BE(leafLength, 0);
    await this.mmrIndexValueStore.upsert({key: LEAF_LENGTH_INDEX, value: leafLengthBuffer});
    return leafLength;
  }
}
