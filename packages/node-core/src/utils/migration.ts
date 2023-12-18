// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SUPPORT_DB} from '@subql/common';
import {
  BigInt,
  Boolean,
  DateObj,
  Float,
  getAllEntitiesRelations,
  GraphQLEntityField,
  GraphQLEntityIndex,
  GraphQLModelsType,
  ID,
  Int,
  Json,
  SequelizeTypes,
  String,
} from '@subql/utils';
import {
  DataType,
  DataTypes,
  IndexesOptions,
  Model,
  ModelAttributeColumnOptions,
  ModelStatic,
  Sequelize,
  Transaction,
  Utils,
} from '@subql/x-sequelize';
import {GraphQLSchema} from 'graphql';
import Pino from 'pino';
import {NodeConfig} from '../configure/NodeConfig';
import {addRelationToMap, formatColumnName, generateHashedIndexName, modelToTableName, syncEnums} from '../utils';
import {getColumnOption, modelsTypeToModelAttributes} from './graphql';
import {
  addBlockRangeColumnToIndexes,
  addHistoricalIdIndex,
  addIdAndBlockRangeAttributes,
  addScopeAndBlockHeightHooks,
  getExistedIndexesQuery,
  SmartTags,
  updateIndexesName,
} from './sync-helper';

function formatAttributes(columnOptions: ModelAttributeColumnOptions): string {
  const type = formatDataType(columnOptions.type);
  const allowNull = columnOptions.allowNull === false ? 'NOT NULL' : '';
  const primaryKey = columnOptions.primaryKey ? 'PRIMARY KEY' : '';
  const unique = columnOptions.unique ? 'UNIQUE' : '';
  const autoIncrement = columnOptions.autoIncrement ? 'AUTO_INCREMENT' : ''; //  PostgreSQL

  // TODO unsupported
  // const defaultValue = options.defaultValue ? `DEFAULT
  // TODO Support relational
  // const references = options.references ? formatReferences(options.references) :

  return `${type} ${allowNull} ${primaryKey} ${unique} ${autoIncrement}`.trim();
}

const sequelizeToPostgresTypeMap = {
  [DataTypes.STRING.name]: (dataType: DataType) => String.sequelizeType,
  [DataTypes.INTEGER.name]: () => Int.sequelizeType,
  [DataTypes.BIGINT.name]: () => BigInt.sequelizeType,
  [DataTypes.UUID.name]: () => ID.sequelizeType,
  [DataTypes.BOOLEAN.name]: () => Boolean.sequelizeType,
  [DataTypes.FLOAT.name]: () => Float.sequelizeType,
  [DataTypes.DATE.name]: () => DateObj.sequelizeType,
  [DataTypes.JSONB.name]: () => Json.sequelizeType,
};

function formatDataType(dataType: DataType): SequelizeTypes {
  if (typeof dataType === 'string') {
    return dataType;
  } else {
    const formatter = sequelizeToPostgresTypeMap[dataType.key];
    return formatter(dataType);
  }
}

export class Migration {
  private readonly transaction: Transaction;
  private sequelizeModels: Set<ModelStatic<any>> = new Set();
  private rawQueries: string[] = [];
  constructor(
    private sequelize: Sequelize,
    private schemaName: string,
    private config: NodeConfig,
    private _tx: Transaction,
    private enumTypeMap: Map<string, string>
  ) // private foreignKeyMap: Map<string, Map<string, SmartTags>>,
  {
    this.transaction = this._tx;
  }

  static async create(
    sequelize: Sequelize,
    schemaName: string,
    graphQLSchema: GraphQLSchema,
    config: NodeConfig,
    tx: Transaction,
    logger: Pino.Logger
  ): Promise<Migration> {
    const modelsRelationsEnums = getAllEntitiesRelations(graphQLSchema);
    const enumTypeMap = new Map<string, string>();
    const foreignKeyMap = new Map<string, Map<string, SmartTags>>();
    // move up here  TODO
    for (const e of modelsRelationsEnums.enums) {
      await syncEnums(sequelize, SUPPORT_DB.postgres, e, schemaName, enumTypeMap, logger);
    }

    // TODO relations
    for (const relation of modelsRelationsEnums.relations) {
      const model = sequelize.model(relation.from);
      const relatedModel = sequelize.model(relation.to);
      addRelationToMap(relation, foreignKeyMap, model, relatedModel);
    }

    return new Migration(
      sequelize,
      schemaName,
      // graphQLSchema,
      config,
      tx,
      // logger,
      enumTypeMap
    );
  }

  // return all the updated models
  async run(): Promise<ModelStatic<Model<any, any>>[]> {
    try {
      for (const query of this.rawQueries) {
        await this.sequelize.query(query, {transaction: this.transaction});
      }

      await this.transaction.commit();
    } catch (e) {
      await this.transaction.rollback();
      throw e;
    }

    await Promise.all([...this.sequelizeModels].map((m) => m.sync()));

    return [...this.sequelizeModels];
  }
  private createModel(model: GraphQLModelsType) {
    const attributes = modelsTypeToModelAttributes(model, this.enumTypeMap);
    const indexes = model.indexes.map(({fields, unique, using}) => ({
      fields: fields.map((field) => Utils.underscoredIf(field, true)),
      unique,
      using,
    }));

    addIdAndBlockRangeAttributes(attributes);

    const sequelizeModel = this.sequelize.define(model.name, attributes, {
      underscored: true,
      comment: model.description,
      freezeTableName: false,
      createdAt: this.config.timestampField,
      updatedAt: this.config.timestampField,
      schema: this.schemaName,
      indexes,
    });

    addScopeAndBlockHeightHooks(sequelizeModel, undefined);

    return sequelizeModel;
  }

  async createTable(model: GraphQLModelsType, blockHeight: number): Promise<void> {
    const attributes = modelsTypeToModelAttributes(model, this.enumTypeMap);
    const indexes = model.indexes.map(({fields, unique, using}) => ({
      fields: fields.map((field) => Utils.underscoredIf(field, true)),
      unique,
      using,
    }));

    if (indexes.length > this.config.indexCountLimit) {
      throw new Error(`too many indexes on entity ${model.name}`);
    }

    const [indexesResult] = await this.sequelize.query(getExistedIndexesQuery(this.schemaName));
    const existedIndexes = indexesResult.map((i) => (i as any).indexname);

    // Historical should be enabled to use projectUpgrade
    addIdAndBlockRangeAttributes(attributes);
    addBlockRangeColumnToIndexes(indexes);
    addHistoricalIdIndex(model, indexes);

    const sequelizeModel = this.sequelize.define(model.name, attributes, {
      underscored: true,
      comment: model.description,
      freezeTableName: false,
      createdAt: this.config.timestampField,
      updatedAt: this.config.timestampField,
      schema: this.schemaName,
      indexes,
    });

    updateIndexesName(model.name, indexes, existedIndexes);
    addScopeAndBlockHeightHooks(sequelizeModel, blockHeight);
    // TODO cockroach compatibility
    // TODO Subscription compatibility

    // TODO Support relational
    this.sequelizeModels.add(sequelizeModel);
  }

  dropTable(model: GraphQLModelsType): void {
    this.rawQueries.push(`DROP TABLE IF EXISTS "${this.schemaName}"."${modelToTableName(model.name)}";`);
  }

  createColumn(model: GraphQLModelsType, field: GraphQLEntityField): void {
    const columnOptions = getColumnOption(field, this.enumTypeMap);
    if (columnOptions.primaryKey) {
      throw new Error('Primary Key migration upgrade is not allowed');
    }
    const dbTableName = modelToTableName(model.name);
    const dbColumnName = formatColumnName(field.name);

    const formattedAttributes = formatAttributes(columnOptions);
    this.rawQueries.push(
      `ALTER TABLE "${this.schemaName}"."${dbTableName}" ADD COLUMN "${dbColumnName}" ${formattedAttributes};`
    );

    // Comments needs to be executed after column creation
    if (columnOptions.comment) {
      this.rawQueries.push(
        `COMMENT ON COLUMN "${this.schemaName}".${dbTableName}.${dbColumnName} IS '${columnOptions.comment}';`
      );
    }
    // perhaps this can be called on a different layer, to avoid duplications
    this.sequelizeModels.add(this.createModel(model));
  }
  dropColumn(model: GraphQLModelsType, field: GraphQLEntityField): void {
    this.rawQueries.push(
      `ALTER TABLE  "${this.schemaName}"."${modelToTableName(model.name)}" DROP COLUMN IF EXISTS ${formatColumnName(
        field.name
      )};`
    );

    this.sequelizeModels.add(this.createModel(model));
  }

  createIndex(model: GraphQLModelsType, index: GraphQLEntityIndex): void {
    const formattedTableName = modelToTableName(model.name);
    const indexOptions: IndexesOptions = {...index, fields: index.fields.map((f) => formatColumnName(f))};

    indexOptions.name = generateHashedIndexName(formattedTableName, indexOptions);

    if (!indexOptions.fields || indexOptions.fields.length === 0) {
      throw new Error("The 'fields' property is required and cannot be empty.");
    }

    this.rawQueries.push(
      `CREATE INDEX "${indexOptions.name}" ON "${this.schemaName}"."${formattedTableName}" (${indexOptions.fields.join(
        ', '
      )})`
    );
  }

  dropIndex(model: GraphQLModelsType, index: GraphQLEntityIndex): void {
    const hashedIndexName = generateHashedIndexName(model.name, index);
    this.rawQueries.push(`DROP INDEX IF EXISTS "${this.schemaName}"."${hashedIndexName}";`);
  }
}
