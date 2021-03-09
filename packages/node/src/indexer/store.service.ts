// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { getAllEntitiesRelations } from '@subql/common';
import { Entity, Store } from '@subql/types';
import { GraphQLSchema } from 'graphql';
import { Sequelize, Transaction } from 'sequelize';
import { modelsTypeToModelAttributes } from '../utils/graphql';
import {
  commentConstraintQuery,
  createUniqueIndexQuery,
  getFkConstraint,
  smartTags,
} from '../utils/sync-helper';

@Injectable()
export class StoreService {
  private tx?: Transaction;

  constructor(private sequelize: Sequelize) {}

  async syncSchema(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graphqlSchema: GraphQLSchema,
    schema: string,
  ): Promise<void> {
    const entitiesRelations = getAllEntitiesRelations(graphqlSchema);
    const models = getAllEntitiesRelations(graphqlSchema).models.map(
      (entity) => {
        const modelAttributes = modelsTypeToModelAttributes(entity);
        return { name: entity.name, attributes: modelAttributes };
      },
    );
    for (const { attributes, name } of models) {
      this.sequelize.define(name, attributes, {
        underscored: true,
        freezeTableName: false,
        schema,
      });
    }

    const extraQueries = [];

    for (const relation of entitiesRelations.relations) {
      const model = this.sequelize.model(relation.from);
      const relatedModel = this.sequelize.model(relation.to);

      if (relation.type === 'belongsTo') {
        model.belongsTo(relatedModel, { foreignKey: `${relation.foreignKey}` });
      } else if (relation.type === 'hasOne') {
        const rel = model.hasOne(relatedModel, {
          foreignKey: `${relation.foreignKey}`,
        });
        const fkConstraint = getFkConstraint(
          rel.target.tableName,
          rel.foreignKey,
        );
        const tags = smartTags({ singleForeignFieldName: relation.fieldName });
        extraQueries.push(
          commentConstraintQuery(
            `${schema}.${rel.target.tableName}`,
            fkConstraint,
            tags,
          ),
          createUniqueIndexQuery(
            schema,
            relatedModel.tableName,
            `${relation.foreignKey}`,
          ),
        );
      } else if (relation.type === 'hasMany') {
        const rel = model.hasMany(relatedModel, {
          foreignKey: `${relation.foreignKey}`,
        });
        const fkConstraint = getFkConstraint(
          rel.target.tableName,
          rel.foreignKey,
        );
        const tags = smartTags({
          fieldName: relation.foreignKey.slice(0, -2),
          foreignFieldName: relation.fieldName,
        });
        extraQueries.push(
          commentConstraintQuery(
            `${schema}.${rel.target.tableName}`,
            fkConstraint,
            tags,
          ),
        );
      }
    }

    await this.sequelize.sync();
    for (const query of extraQueries) {
      await this.sequelize.query(query);
    }
  }

  setTransaction(tx: Transaction) {
    if (this.tx) {
      throw new Error('more than one tx created');
    }
    this.tx = tx;
    tx.afterCommit(() => (this.tx = undefined));
  }

  getStore(): Store {
    return {
      get: async (entity: string, id: string): Promise<Entity | null> => {
        const model = this.sequelize.model(entity);
        assert(model, `model ${entity} not exists`);
        const record = await model.findOne({
          where: { id },
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
