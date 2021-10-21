// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { hexToU8a, u8aToBuffer } from '@polkadot/util';
import { GraphQLModelsRelationsEnums } from '@subql/common/graphql/types';
import { Entity, Store } from '@subql/types';
import { camelCase, flatten, upperFirst } from 'lodash';
import { QueryTypes, Sequelize, Transaction, Utils } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { modelsTypeToModelAttributes } from '../utils/graphql';
import { getLogger } from '../utils/logger';
import { camelCaseObjectKey } from '../utils/object';
import {
  commentConstraintQuery,
  createUniqueIndexQuery,
  getFkConstraint,
  smartTags,
} from '../utils/sync-helper';
import { MetadataFactory, MetadataRepo } from './entities/Metadata.entity';
import { PoiFactory, PoiRepo, ProofOfIndex } from './entities/Poi.entity';
import { PoiService } from './poi.service';
import { StoreOperations } from './StoreOperations';
import { OperationType } from './types';
const logger = getLogger('store');
const NULL_MERKEL_ROOT = hexToU8a('0x00');

interface IndexField {
  entityName: string;
  fieldName: string;
  isUnique: boolean;
  type: string;
}

@Injectable()
export class StoreService {
  private tx?: Transaction;
  private modelIndexedFields: IndexField[];
  private schema: string;
  private modelsRelations: GraphQLModelsRelationsEnums;
  private poiRepo: PoiRepo;
  private metaDataRepo: MetadataRepo;
  private operationStack: StoreOperations;

  constructor(
    private sequelize: Sequelize,
    private config: NodeConfig,
    private poiService: PoiService,
  ) {}

  async init(
    modelsRelations: GraphQLModelsRelationsEnums,
    schema: string,
  ): Promise<void> {
    this.schema = schema;
    this.modelsRelations = modelsRelations;
    try {
      await this.syncSchema(this.schema);
    } catch (e) {
      logger.error(e, `Having a problem when syncing schema`);
      process.exit(1);
    }
    try {
      this.modelIndexedFields = await this.getAllIndexFields(this.schema);
    } catch (e) {
      logger.error(e, `Having a problem when get indexed fields`);
      process.exit(1);
    }
  }

  async syncSchema(schema: string): Promise<void> {
    const enumTypeMap = new Map<string, string>();

    let i = 0;
    for (const e of this.modelsRelations.enums) {
      // We shouldn't set the typename to e.name because it could potentially create SQL injection,
      // using a replacement at the type name location doesn't work.
      const enumTypeName = `custom_enum_${i}`;

      await this.sequelize.query(
        `DROP TYPE IF EXISTS ${enumTypeName}; CREATE TYPE ${enumTypeName} as ENUM (${e.values
          .map(() => '?')
          .join(',')});`,
        {
          replacements: e.values,
        },
      );

      const comment = `@enum\\n@enumName ${e.name}${
        e.description ? `\\n ${e.description}` : ''
      }`;

      await this.sequelize.query(`COMMENT ON TYPE ${enumTypeName} IS E?`, {
        replacements: [comment],
      });
      enumTypeMap.set(e.name, enumTypeName);

      i++;
    }
    for (const model of this.modelsRelations.models) {
      const attributes = modelsTypeToModelAttributes(model, enumTypeMap);
      const indexes = model.indexes.map(({ fields, unique, using }) => ({
        fields: fields.map((field) => Utils.underscoredIf(field, true)),
        unique,
        using,
      }));
      if (indexes.length > this.config.indexCountLimit) {
        throw new Error(`too many indexes on entity ${model.name}`);
      }
      this.sequelize.define(model.name, attributes, {
        underscored: true,
        comment: model.description,
        freezeTableName: false,
        createdAt: this.config.timestampField,
        updatedAt: this.config.timestampField,
        schema,
        indexes,
      });
    }
    const extraQueries = [];
    for (const relation of this.modelsRelations.relations) {
      const model = this.sequelize.model(relation.from);
      const relatedModel = this.sequelize.model(relation.to);
      switch (relation.type) {
        case 'belongsTo': {
          model.belongsTo(relatedModel, { foreignKey: relation.foreignKey });
          break;
        }
        case 'hasOne': {
          const rel = model.hasOne(relatedModel, {
            foreignKey: relation.foreignKey,
          });
          const fkConstraint = getFkConstraint(
            rel.target.tableName,
            rel.foreignKey,
          );
          const tags = smartTags({
            singleForeignFieldName: relation.fieldName,
          });
          extraQueries.push(
            commentConstraintQuery(
              `${schema}.${rel.target.tableName}`,
              fkConstraint,
              tags,
            ),
            createUniqueIndexQuery(
              schema,
              relatedModel.tableName,
              relation.foreignKey,
            ),
          );
          break;
        }
        case 'hasMany': {
          const rel = model.hasMany(relatedModel, {
            foreignKey: relation.foreignKey,
          });
          const fkConstraint = getFkConstraint(
            rel.target.tableName,
            rel.foreignKey,
          );
          const tags = smartTags({
            foreignFieldName: relation.fieldName,
          });
          extraQueries.push(
            commentConstraintQuery(
              `${schema}.${rel.target.tableName}`,
              fkConstraint,
              tags,
            ),
          );

          break;
        }
        default:
          throw new Error('Relation type is not supported');
      }
    }
    if (this.config.proofOfIndex) {
      this.poiRepo = PoiFactory(this.sequelize, schema);
    }
    this.metaDataRepo = MetadataFactory(this.sequelize, schema);

    await this.sequelize.sync();
    for (const query of extraQueries) {
      await this.sequelize.query(query);
    }
  }

  setTransaction(tx: Transaction) {
    this.tx = tx;
    tx.afterCommit(() => (this.tx = undefined));
    if (this.config.proofOfIndex) {
      this.operationStack = new StoreOperations(this.modelsRelations.models);
    }
  }

  async setPoi(tx: Transaction, blockPoi: ProofOfIndex): Promise<void> {
    const model = this.sequelize.model('_poi');
    assert(model, `model _poi not exists`);
    blockPoi.chainBlockHash = u8aToBuffer(blockPoi.chainBlockHash);
    blockPoi.hash = u8aToBuffer(blockPoi.hash);
    blockPoi.parentHash = u8aToBuffer(blockPoi.parentHash);
    await model.upsert(blockPoi, { transaction: this.tx });
  }

  getOperationMerkleRoot(): Uint8Array {
    this.operationStack.makeOperationMerkleTree();
    const merkelRoot = this.operationStack.getOperationMerkleRoot();
    if (merkelRoot === null) {
      return NULL_MERKEL_ROOT;
    }
    return merkelRoot;
  }

  private async getAllIndexFields(schema: string) {
    const fields: IndexField[][] = [];
    for (const entity of this.modelsRelations.models) {
      const model = this.sequelize.model(entity.name);
      const tableFields = await this.packEntityFields(
        schema,
        entity.name,
        model.tableName,
      );
      fields.push(tableFields);
    }
    return flatten(fields);
  }

  private async packEntityFields(
    schema: string,
    entity: string,
    table: string,
  ): Promise<IndexField[]> {
    const rows = await this.sequelize.query(
      `select
    '${entity}' as entity_name,
    a.attname as field_name,
    idx.indisunique as is_unique,
    am.amname as type
from
    pg_index idx
    JOIN pg_class cls ON cls.oid=idx.indexrelid
    JOIN pg_class tab ON tab.oid=idx.indrelid
    JOIN pg_am am ON am.oid=cls.relam,
    pg_namespace n,
    pg_attribute a
where
  n.nspname = '${schema}'
  and tab.relname = '${table}'
  and a.attrelid = tab.oid
  and a.attnum = ANY(idx.indkey)
  and not idx.indisprimary
group by
    n.nspname,
    a.attname,
    tab.relname,
    idx.indisunique,
    am.amname`,
      {
        type: QueryTypes.SELECT,
      },
    );
    return rows.map((result) => camelCaseObjectKey(result)) as IndexField[];
  }

  getStore(): Store {
    return {
      get: async (entity: string, id: string): Promise<Entity | undefined> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        const record = await model.findOne({
          where: { id },
          transaction: this.tx,
        });
        return record?.toJSON() as Entity;
      },
      getByField: async (
        entity: string,
        field: string,
        value,
      ): Promise<Entity[] | undefined> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        const indexed =
          this.modelIndexedFields.findIndex(
            (indexField) =>
              upperFirst(camelCase(indexField.entityName)) === entity &&
              camelCase(indexField.fieldName) === field,
          ) > -1;
        assert(
          indexed,
          `to query by field ${field}, an index must be created on model ${entity}`,
        );
        const records = await model.findAll({
          where: { [field]: value },
          transaction: this.tx,
          limit: this.config.queryLimit,
        });
        return records.map((record) => record.toJSON() as Entity);
      },
      getOneByField: async (
        entity: string,
        field: string,
        value,
      ): Promise<Entity | undefined> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        const indexed =
          this.modelIndexedFields.findIndex(
            (indexField) =>
              upperFirst(camelCase(indexField.entityName)) === entity &&
              camelCase(indexField.fieldName) === field &&
              indexField.isUnique,
          ) > -1;
        assert(
          indexed,
          `to query by field ${field}, an unique index must be created on model ${entity}`,
        );
        const record = await model.findOne({
          where: { [field]: value },
          transaction: this.tx,
        });
        return record?.toJSON() as Entity;
      },
      set: async (entity: string, id: string, data: Entity): Promise<void> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        await model.upsert(data, { transaction: this.tx });
        if (this.config.proofOfIndex) {
          this.operationStack.put(OperationType.Set, entity, data);
        }
      },
      remove: async (entity: string, id: string): Promise<void> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        await model.destroy({ where: { id }, transaction: this.tx });
        if (this.config.proofOfIndex) {
          this.operationStack.put(OperationType.Remove, entity, id);
        }
      },
    };
  }
}
