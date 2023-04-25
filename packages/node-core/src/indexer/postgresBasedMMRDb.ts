// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Db} from '@subql/x-merkle-mountain-range';
import {Sequelize, DataTypes, Model, ModelStatic} from 'sequelize';
import {getLogger} from '../logger';

const logger = getLogger('pg-based-db');

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

interface LeafLengthAttributes {
  id: number;
  value: number;
}

class LeafLengthInstance extends Model<LeafLengthAttributes> implements LeafLengthAttributes {
  id!: number;
  value!: number;
}

export class PgBasedMMRDB implements Db {
  private sequelize;
  private KVStore: ModelStatic<MMRIndexValueStoreInstance>;
  private LeafLength: ModelStatic<LeafLengthInstance>;

  constructor(sequelize: Sequelize, schema: string) {
    this.sequelize = sequelize;
    this.KVStore = this.initKVStoreModel(this.sequelize, schema);

    this.LeafLength = this.initLeafLengthModel(this.sequelize, schema);
  }

  private initKVStoreModel(sequelize: Sequelize, schema: string): ModelStatic<MMRIndexValueStoreInstance> {
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
        modelName: 'KVStore',
        schema: schema,
      }
    );
    return MMRIndexValueStoreInstance;
  }

  private initLeafLengthModel(sequelize: Sequelize, schema: string): ModelStatic<LeafLengthInstance> {
    LeafLengthInstance.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        value: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'LeafLength',
        schema: schema,
      }
    );
    return LeafLengthInstance;
  }

  async connect() {
    await this.KVStore.sync();
    await this.LeafLength.sync();
  }

  async get(key: number) {
    //logger.info(`getting ${key}`)
    const record = await this.KVStore.findByPk(key);
    return record ? record.value : null;
  }

  async set(value: any, key: number) {
    //logger.info(`creating ${key}`)
    if (value === null || value === undefined) {
      throw new Error('Cannot set a null or undefined value');
    }

    await this.KVStore.upsert({key, value});
  }

  async delete(key: string) {
    await this.KVStore.destroy({where: {key}});
  }

  async getNodes(): Promise<NodeMap> {
    const nodes = await this.KVStore.findAll<MMRIndexValueStoreInstance>();
    const nodeMap: NodeMap = {};
    nodes.forEach((node) => {
      nodeMap[node.key] = node.value;
    });
    return nodeMap;
  }

  async getLeafLength() {
    const record = await this.LeafLength.findByPk(1);
    return record ? record.value : 0;
  }

  async setLeafLength(leafLength: number): Promise<number> {
    const [record, created] = await this.LeafLength.findOrCreate({
      where: {id: 1},
      defaults: {id: 1, value: leafLength},
    });

    if (!created) {
      record.value = leafLength;
      await record.save();
    }

    return leafLength;
  }
}
