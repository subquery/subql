// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import {
  GraphQLModelsRelations,
  GraphQLModelsType,
} from '@subql/common/graphql/types';
import { Entity, Store } from '@subql/types';
import { Sequelize, Transaction, Utils } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { modelsTypeToModelAttributes } from '../utils/graphql';
import {
  commentConstraintQuery,
  createSubscriptionNotifyFunctionQuery,
  createSubscriptionTrigger,
  createUniqueIndexQuery,
  getFkConstraint,
  smartTags,
} from '../utils/sync-helper';

@Injectable()
export class StoreService {
  private tx?: Transaction;
  private models: GraphQLModelsType[];

  constructor(private sequelize: Sequelize, private config: NodeConfig) {}

  async syncSchema(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelsRelations: GraphQLModelsRelations,
    schema: string,
  ): Promise<void> {
    const extraQueries = [];
    this.models = modelsRelations.models;
    for (const model of modelsRelations.models) {
      const attributes = modelsTypeToModelAttributes(model);
      const indexes = model.indexes.map(({ fields, unique }) => ({
        fields: fields.map((field) => Utils.underscoredIf(field, true)),
        unique,
      }));
      if (indexes.length > this.config.indexCountLimit) {
        throw new Error(`too many indexes on entity ${model.name}`);
      }
      this.sequelize.define(model.name, attributes, {
        underscored: true,
        freezeTableName: false,
        schema,
        indexes,
      });
      const subscriptionModel = this.sequelize.model(model.name);
      extraQueries.push(
        ...createSubscriptionNotifyFunctionQuery(
          schema,
          subscriptionModel.tableName,
        ),
        ...createSubscriptionTrigger(schema, subscriptionModel.tableName),
      );
    }
    for (const relation of modelsRelations.relations) {
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
    await this.sequelize.sync();
    for (const query of extraQueries) {
      await this.sequelize.query(query);
    }
  }

  setTransaction(tx: Transaction) {
    this.tx = tx;
    tx.afterCommit(() => (this.tx = undefined));
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
        const modelDef = this.models.find((m) => m.name === entity);
        const indexed =
          modelDef.indexes.findIndex((idx) => idx.fields.includes(field)) > -1;
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
        const modelDef = this.models.find((m) => m.name === entity);
        const indexed =
          modelDef.indexes.findIndex((idx) => idx.fields.includes(field)) > -1;
        assert(
          indexed,
          `to query by field ${field}, an index must be created on model ${entity}`,
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
      },
      remove: async (entity: string, id: string): Promise<void> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        await model.destroy({ where: { id }, transaction: this.tx });
      },
    };
  }
}
