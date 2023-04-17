// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Sequelize, DataTypes, Model, ModelStatic} from 'sequelize';
import {getLogger} from '../logger';

const logger = getLogger('pg-based-db');

interface NodeMap {
  [key: string]: Buffer;
}

interface KVStoreAttributes {
  key: number;
  value: Buffer;
}

class KVStoreInstance extends Model<KVStoreAttributes> implements KVStoreAttributes {
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

export class PgBasedDB {
  private sequelize;
  private KVStore: ModelStatic<KVStoreInstance>;
  private LeafLength: ModelStatic<LeafLengthInstance>;

  constructor(sequelize: Sequelize, wordSize = 64) {
    this.sequelize = sequelize;
    this.KVStore = this.initKVStoreModel(this.sequelize);

    this.LeafLength = this.initLeafLengthModel(this.sequelize);
  }

  private initKVStoreModel(sequelize: Sequelize): ModelStatic<KVStoreInstance> {
    KVStoreInstance.init(
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
      }
    );
    return KVStoreInstance;
  }

  private initLeafLengthModel(sequelize: Sequelize): ModelStatic<LeafLengthInstance> {
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
      }
    );
    return LeafLengthInstance;
  }

  async connect() {
    await this.sequelize.authenticate();
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
    const nodes = await this.KVStore.findAll<KVStoreInstance>();
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
      defaults: {value: leafLength},
    });

    if (!created) {
      record.value = leafLength;
      await record.save();
    }

    return leafLength;
  }

  async disconnect() {
    await this.sequelize.close();
  }
}
