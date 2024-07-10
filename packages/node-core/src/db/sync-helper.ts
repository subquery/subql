// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {hashName, blake2AsHex, IndexType, GraphQLModelsType, GraphQLRelationsType} from '@subql/utils';
import {
  DataTypes,
  IndexesOptions,
  Model,
  ModelAttributeColumnOptions,
  ModelAttributes,
  ModelStatic,
  QueryTypes,
  Sequelize,
  TableNameWithSchema,
  Utils,
} from '@subql/x-sequelize';
import {ModelAttributeColumnReferencesOptions, ModelIndexesOptions} from '@subql/x-sequelize/types/model';
import {EnumType} from '../utils';
import {formatAttributes, generateIndexName, modelToTableName} from './sequelizeUtil';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Toposort = require('toposort-class');

export type Query = {
  sql: string;
  replacements?: any[]; // TODO be stricter with type
};

/**
 * @deprecated use Query instead for increased security
 * */
export type QueryString = Query | string;

export function isQuery(input: QueryString): input is Query {
  return (input as any).sql;
}

export interface SmartTags {
  foreignKey?: string;
  foreignFieldName?: string;
  singleForeignFieldName?: string;
}

const tagOrder = {
  foreignKey: 0,
  foreignFieldName: 1,
  singleForeignFieldName: 2,
};

export interface NotifyTriggerPayload {
  triggerName: string;
  eventManipulation: string;
}

const NotifyTriggerManipulationType = [`INSERT`, `DELETE`, `UPDATE`];

const byTagOrder = (a: [keyof SmartTags, any], b: [keyof SmartTags, any]) => {
  return tagOrder[a[0]] - tagOrder[b[0]];
};

export function smartTags(tags: SmartTags, separator = '\n'): string {
  return (Object.entries(tags) as [keyof SmartTags, any][])
    .sort(byTagOrder)
    .map(([k, v]) => `@${k} ${v}`)
    .join(separator);
}

export function getVirtualFkTag(field: string, to: string): string {
  return `(${underscored(field)}) REFERENCES ${to} (id)`;
}

export const underscored = (input: string) => Utils.underscoredIf(input, true);

export function getFkConstraint(tableName: string, foreignKey: string): string {
  return [tableName, foreignKey, 'fkey'].map(underscored).join('_');
}

export function getUniqConstraint(tableName: string, field: string): string {
  return [tableName, field, 'uindex'].map(underscored).join('_');
}

function escapedName(...args: string[]): string {
  return args.map((a) => `"${a}"`).join('.');
}

function commentOn(
  type: 'CONSTRAINT' | 'TABLE' | 'COLUMN' | 'FUNCTION',
  entity: string,
  comment: string,
  constraint?: string
): Query {
  const constraintPart = constraint ? `${constraint} ON ` : '';
  return {sql: `COMMENT ON ${type} ${constraintPart}${entity} IS ?;`, replacements: [comment]};
}

export function commentConstraintQuery(schema: string, table: string, constraint: string, comment: string): Query {
  return commentOn('CONSTRAINT', escapedName(schema, table), comment, constraint);
}

export function commentTableQuery(schema: string, table: string, comment: string): Query {
  return commentOn('TABLE', escapedName(schema, table), comment);
}

export function commentColumnQuery(schema: string, table: string, column: string, comment: string): Query {
  return commentOn('COLUMN', escapedName(schema, table, column), comment);
}

export function commentOnFunction(schema: string, functionName: string, comment: string): Query {
  return commentOn('FUNCTION', escapedName(schema, functionName), comment);
}

// This is used when historical is disabled so that we can perform bulk updates
export function constraintDeferrableQuery(table: string, constraint: string): string {
  return `ALTER TABLE ${table} ALTER CONSTRAINT ${constraint} DEFERRABLE INITIALLY IMMEDIATE`;
}

export function addTagsToForeignKeyMap(
  map: Map<string, Map<string, SmartTags>>,
  tableName: string,
  foreignKey: string,
  newTags: SmartTags
): void {
  if (!map.has(tableName)) {
    map.set(tableName, new Map<string, SmartTags>());
  }
  const tableKeys = map.get(tableName);
  let foreignKeyTags = tableKeys?.get(foreignKey) || ({} as SmartTags);
  foreignKeyTags = Object.assign(foreignKeyTags, newTags);
  tableKeys?.set(foreignKey, foreignKeyTags);
}

export const BTREE_GIST_EXTENSION_EXIST_QUERY = `SELECT * FROM pg_extension where extname = 'btree_gist'`;

export function createUniqueIndexQuery(schema: string, table: string, field: string): string {
  return `create unique index if not exists "${getUniqConstraint(
    table,
    field
  )}" on "${schema}"."${table}" (${underscored(field)})`;
}

// Subscriptions
export async function getTriggers(sequelize: Sequelize, triggerName: string): Promise<any[]> {
  return sequelize.query(
    `select trigger_name as "triggerName", event_manipulation as "eventManipulation" from information_schema.triggers
          WHERE trigger_name = :triggerName`,
    {
      replacements: {triggerName},
      type: QueryTypes.SELECT,
    }
  );
}

export async function getFunctions(sequelize: Sequelize, schema: string, functionName: string): Promise<any[]> {
  return sequelize.query(
    `SELECT
         routine_schema as function_schema,
         routine_name as function_name
     FROM
         information_schema.routines
     WHERE
         specific_schema not in ('pg_catalog', 'information_schema')
       and routine_type = 'FUNCTION'
       and routine_schema = :schema
       and routine_name = :functionName;
    `,
    {
      replacements: {schema, functionName},
      type: QueryTypes.SELECT,
    }
  );
}

export function createSendNotificationTriggerFunction(schema: string) {
  return `
CREATE OR REPLACE FUNCTION "${schema}".send_notification()
    RETURNS trigger AS $$
DECLARE
    channel TEXT;
    row RECORD;
    payload JSONB;
BEGIN
    channel:= TG_ARGV[0];
    IF (TG_OP = 'DELETE') THEN
        row = OLD;
    ELSE
        row = NEW;
    END IF;
    payload = jsonb_build_object(
            'id', row.id,
            'mutation_type', TG_OP,
            '_entity', row);
    IF payload -> '_entity' ? '_block_range' THEN
        IF NOT upper_inf(row._block_range) THEN
            RETURN NULL;
        END IF;
        payload = payload || '{"mutation_type": "UPDATE"}';
        payload = payload #- '{"_entity","_id"}';
        payload = payload #- '{"_entity","_block_range"}';
    END IF;
    IF (octet_length(payload::text) >= 8000) THEN
        payload = payload || '{"_entity": null}';
    END IF;
    PERFORM pg_notify(
            channel::text,
            payload::text);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;`;
}

export function createNotifyTrigger(schema: string, table: string): string {
  const triggerName = hashName(schema, 'notify_trigger', table);
  const channelName = hashName(schema, 'notify_channel', table);
  return `
DO $$
BEGIN
    CREATE TRIGGER "${triggerName}" AFTER INSERT OR UPDATE OR DELETE
    ON "${schema}"."${table}"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".send_notification('${channelName}');
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Trigger already exists. Ignoring...';
END$$;
  `;
}

function dropTrigger(schema: string, table: string, triggerName: string): string {
  return `DROP TRIGGER IF EXISTS "${triggerName}"
    ON "${schema}"."${table}";`;
}

export function dropNotifyTrigger(schema: string, table: string): string {
  const triggerName = hashName(schema, 'notify_trigger', table);
  return dropTrigger(schema, table, triggerName);
}

function dropFunction(schema: string, functionName: string): string {
  return `DROP FUNCTION IF EXISTS "${schema}"."${functionName}";`;
}

export function dropNotifyFunction(schema: string): string {
  return dropFunction(schema, 'send_notification');
}

// Hot schema reload, _metadata table
// Should also use Idempotent
export function createSchemaTrigger(schema: string, metadataTableName: string): string {
  const triggerName = hashName(schema, 'schema_trigger', metadataTableName);
  return `
  CREATE TRIGGER "${triggerName}"
    AFTER UPDATE
    ON "${schema}"."${metadataTableName}"
    FOR EACH ROW
    WHEN ( new.key = 'schemaMigrationCount')
    EXECUTE FUNCTION "${schema}".schema_notification();`;
}

export function createSchemaTriggerFunction(schema: string): string {
  return `
  CREATE OR REPLACE FUNCTION "${schema}".schema_notification()
    RETURNS trigger AS $$
  BEGIN
    PERFORM pg_notify(
            '${hashName(schema, 'schema_channel', '_metadata')}',
            'schema_updated');
    RETURN NULL;
  END;
  $$ LANGUAGE plpgsql;`;
}

export function enumNameToHash(enumName: string): string {
  return blake2AsHex(enumName).substr(2, 10);
}

export function getExistedIndexesQuery(schema: string): string {
  return `SELECT indexname FROM pg_indexes WHERE schemaname = '${schema}'`;
}

export async function getDbSizeAndUpdateMetadata(sequelize: Sequelize, schema: string): Promise<bigint> {
  const [result] = (
    await sequelize.query(
      `
        WITH schema_size AS (
          SELECT sum(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)))::bigint AS size
        FROM pg_tables
        WHERE schemaname = :schema
          )
        INSERT INTO "${schema}"._metadata (key, value, "createdAt", "updatedAt")
        VALUES ('dbSize', to_jsonb((SELECT size FROM schema_size)), now(), now())
        ON CONFLICT (key)
          DO UPDATE SET value = to_jsonb((SELECT size FROM schema_size)), "updatedAt" = now()
               RETURNING (SELECT size FROM schema_size) AS size;
      `,
      {
        replacements: {schema},
        type: QueryTypes.INSERT,
      }
    )
  )[0] as unknown as {size: number}[];

  return BigInt(result.size);
}

// SQL improvement
const DEFAULT_SQL_EXE_BATCH = 2000;

/**
 * Improve SQL which could potentially increase DB IO significantly,
 * this executes it by batch size, and in ASC id order
 **/
export const sqlIterator = (tableName: string, sql: string, batch: number = DEFAULT_SQL_EXE_BATCH): string => {
  return `
  DO $$
  DECLARE
    start_id INT;
    end_id INT;
    batch_size INT := ${batch};
    current_id INT;
  BEGIN
    SELECT MIN(id), MAX(id) INTO start_id, end_id FROM ${tableName};

    IF start_id IS NOT NULL AND end_id IS NOT NULL THEN
        FOR current_id IN start_id..end_id BY batch_size LOOP
            ${sql};
        END LOOP;
    END IF;
  END $$
  `;
};

// Only used with historical to add indexes to ID fields for gettign entitities by ID
export function addHistoricalIdIndex(model: GraphQLModelsType, indexes: IndexesOptions[]): void {
  const idFieldName = model.fields.find((field) => field.type === 'ID')?.name;
  if (idFieldName && !indexes.find((idx) => idx.fields?.includes(idFieldName))) {
    indexes.push({
      fields: [Utils.underscoredIf(idFieldName, true)],
      unique: false,
    });
  }
}

export function generateHashedIndexName(modelName: string, indexOptions: IndexesOptions): string {
  return blake2AsHex(`${modelName}_${(indexOptions.fields ?? []).join('_')}`, 64).substring(0, 63);
}

export function updateIndexesName(modelName: string, indexes: IndexesOptions[], existedIndexes: string[]): void {
  indexes.forEach((index) => {
    // follow same pattern as _generateIndexName
    const tableName = modelToTableName(modelName);
    const deprecated = generateIndexName(tableName, index);

    if (!existedIndexes.includes(deprecated)) {
      index.name = generateHashedIndexName(modelName, index);
    }
  });
}

export function addIdAndBlockRangeAttributes(attributes: ModelAttributes<Model<any, any>, any>): void {
  (attributes.id as ModelAttributeColumnOptions).primaryKey = false;
  attributes.__id = {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  } as ModelAttributeColumnOptions;
  attributes.__block_range = {
    type: DataTypes.RANGE(DataTypes.BIGINT),
    allowNull: false,
  } as ModelAttributeColumnOptions;
}

export function addBlockRangeColumnToIndexes(indexes: IndexesOptions[]): void {
  indexes.forEach((index) => {
    if (index.using === IndexType.GIN) {
      return;
    }
    if (!index.fields) {
      index.fields = [];
    }
    index.fields.push('_block_range');
    index.using = IndexType.GIST;
    // GIST does not support unique indexes
    index.unique = false;
  });
}

export function addRelationToMap(
  relation: GraphQLRelationsType,
  foreignKeys: Map<string, Map<string, SmartTags>>,
  model: ModelStatic<any>,
  relatedModel: ModelStatic<any>
): void {
  switch (relation.type) {
    case 'belongsTo': {
      addTagsToForeignKeyMap(foreignKeys, model.tableName, relation.foreignKey, {
        foreignKey: getVirtualFkTag(relation.foreignKey, relatedModel.tableName),
      });
      break;
    }
    case 'hasOne': {
      addTagsToForeignKeyMap(foreignKeys, relatedModel.tableName, relation.foreignKey, {
        singleForeignFieldName: relation.fieldName,
      });
      break;
    }
    case 'hasMany': {
      addTagsToForeignKeyMap(foreignKeys, relatedModel.tableName, relation.foreignKey, {
        foreignFieldName: relation.fieldName,
      });
      break;
    }
    default:
      throw new Error('Relation type is not supported');
  }
}

export function generateCreateTableQuery(
  model: ModelStatic<Model<any, any>>,
  schema: string,
  withoutForeignKey: boolean
): QueryString[] {
  const tableName = model.tableName;

  const attributes = model.getAttributes();
  const columnDefinitions: string[] = [];
  const primaryKeyColumns: string[] = [];
  const comments: Query[] = [];

  Object.keys(attributes).forEach((key) => {
    const attr = attributes[key];

    assert(attr.field, 'Expected field to be set on attribute');

    const columnDefinition = `"${attr.field}" ${formatAttributes(attr, schema, withoutForeignKey)}`;

    columnDefinitions.push(columnDefinition);
    if (attr.comment) {
      comments.push(commentColumnQuery(schema, tableName, attr.field, attr.comment));
    }
    if (attr.primaryKey) {
      primaryKeyColumns.push(`"${attr.field}"`);
    }
  });

  const primaryKeyDefinition = `, PRIMARY KEY (${primaryKeyColumns.join(', ')})`;

  const tableQuery = `CREATE TABLE IF NOT EXISTS "${schema}"."${tableName}" (${columnDefinitions.join(
    ',\n      '
  )}${primaryKeyDefinition});`;

  return [tableQuery, ...comments];
}

export function generateCreateIndexQuery(
  indexes: readonly ModelIndexesOptions[],
  schema: string,
  tableName: string
): string[] {
  const indexQueries: string[] = [];
  indexes.forEach((index) => {
    const fieldsList = index.fields?.map((field) => `"${field}"`).join(', ');
    const unique = index.unique ? 'UNIQUE' : '';
    const indexUsed = index.using ? `USING ${index.using}` : '';
    const indexName = index.name;

    const query = `CREATE ${unique} INDEX IF NOT EXISTS "${indexName}" ON "${schema}"."${tableName}" ${indexUsed} (${fieldsList});`;
    indexQueries.push(query);
  });

  return indexQueries;
}

export function sortModels(relations: GraphQLRelationsType[], models: GraphQLModelsType[]): GraphQLModelsType[] | null {
  const sorter = new Toposort();

  models.forEach((model) => {
    sorter.add(model.name, []);
  });

  relations.forEach(({from, to}) => {
    sorter.add(from, to);
  });

  let sortedModelNames: string[];
  try {
    sortedModelNames = sorter.sort();
  } catch (error) {
    // Handle cyclic dependency error by returning null
    if (error instanceof Error && error.message.startsWith('Cyclic dependency found.')) {
      return null;
    } else {
      throw error;
    }
  }

  const sortedModels = sortedModelNames
    .map((modelName) => models.find((model) => model.name === modelName))
    .filter(Boolean) as GraphQLModelsType[];

  return sortedModels.length > 0 ? sortedModels : null;
}

export function validateNotifyTriggers(triggerName: string, triggers: NotifyTriggerPayload[]): void {
  if (triggers.length !== NotifyTriggerManipulationType.length) {
    throw new Error(
      `Found ${triggers.length} ${triggerName} triggers, expected ${NotifyTriggerManipulationType.length} triggers`
    );
  }
  triggers.map((t) => {
    if (!NotifyTriggerManipulationType.includes(t.eventManipulation)) {
      throw new Error(`Found unexpected trigger ${t.triggerName} with manipulation ${t.eventManipulation}`);
    }
  });
}

export async function getExistingForeignKeys(schema: string, sequelize: Sequelize): Promise<string[]> {
  const results = (await sequelize.query(
    `
        SELECT
          tc.constraint_name
        FROM
          information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                 ON tc.constraint_name = kcu.constraint_name
                   AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                 ON ccu.constraint_name = tc.constraint_name
                   AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = :schema;
    `,
    {
      replacements: {schema: schema},
      type: QueryTypes.SELECT,
    }
  )) as {constraint_name: string}[];
  return results.map((r) => r.constraint_name);
}

export async function getExistingEnums(schema: string, sequelize: Sequelize): Promise<Map<string, EnumType>> {
  const enumTypeMap = new Map<string, EnumType>();

  const results = (await sequelize.query(
    `
        SELECT pg_enum.enumlabel as enum_value, t.typname as type_name
        FROM pg_type t
               JOIN pg_enum ON pg_enum.enumtypid = t.oid
               JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = :schema
        ORDER BY t.typname, enumsortorder;
    `,
    {
      replacements: {schema: schema},
      type: QueryTypes.SELECT,
    }
  )) as {enum_value: string; type_name: string}[];

  results.forEach(({enum_value, type_name}) => {
    if (!enumTypeMap.has(type_name)) {
      enumTypeMap.set(type_name, {enumValues: [enum_value]});
    } else {
      enumTypeMap.get(type_name)?.enumValues.push(enum_value);
    }
  });

  return enumTypeMap;
}

// enums
export const dropEnumQuery = (enumTypeValue: string, schema: string): string =>
  `DROP TYPE IF EXISTS "${schema}"."${enumTypeValue}";`;
export const commentOnEnumQuery = (type: string, comment: string): string => `COMMENT ON TYPE ${type} IS E${comment};`;
export const createEnumQuery = (type: string, enumValues: string): string =>
  `CREATE TYPE ${type} AS ENUM (${enumValues});`;

// relations
export const dropRelationQuery = (schemaName: string, tableName: string, fkConstraint: string): string =>
  `ALTER TABLE "${schemaName}"."${tableName}" DROP CONSTRAINT IF EXISTS ${fkConstraint};`;

export function generateForeignKeyQuery(attribute: ModelAttributeColumnOptions, tableName: string): string | void {
  const references = attribute?.references as ModelAttributeColumnReferencesOptions;
  if (!references) {
    return;
  }
  const foreignTable = references.model as TableNameWithSchema;
  assert(attribute.field, 'Missing field on attribute');
  const fkey = getFkConstraint(tableName, attribute.field);
  let query = `
  DO $$
  BEGIN
    ALTER TABLE "${foreignTable.schema}"."${tableName}"
      ADD
      CONSTRAINT ${fkey}
      FOREIGN KEY (${attribute.field})
      REFERENCES "${foreignTable.schema}"."${foreignTable.tableName}" (${references.key})`;
  if (attribute.onDelete) {
    query += ` ON DELETE ${attribute.onDelete}`;
  }
  if (attribute.onUpdate) {
    query += ` ON UPDATE ${attribute.onUpdate}`;
  }
  if (references.deferrable) {
    query += ` DEFERRABLE`;
  }
  query += `;
  EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists. Ignoring...';
  END$$;
`;
  return `${query.trim()};`;
}

// indexes
export const dropIndexQuery = (schema: string, hashedIndexName: string): string =>
  `DROP INDEX IF EXISTS "${schema}"."${hashedIndexName}";`;
export const createIndexQuery = (indexOptions: IndexesOptions, tableName: string, schema: string): string => {
  if (!indexOptions.fields || indexOptions.fields.length === 0) {
    throw new Error("The 'fields' property is required and cannot be empty.");
  }
  return (
    `CREATE ${indexOptions.unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS "${indexOptions.name}" ` +
    `ON "${schema}"."${tableName}" ` +
    `${indexOptions.using ? `USING ${indexOptions.using} ` : ''}` +
    `(${indexOptions.fields.join(', ')});`
  );
};

// columns
export const dropColumnQuery = (schema: string, columnName: string, tableName: string): string =>
  `ALTER TABLE  "${schema}"."${modelToTableName(tableName)}" DROP COLUMN IF EXISTS ${columnName};`;

export const createColumnQuery = (schema: string, table: string, columnName: string, attributes: string): string =>
  `ALTER TABLE ${escapedName(schema, table)} ADD COLUMN IF NOT EXISTS "${columnName}" ${attributes};`;

// fullTextSearch
const TS_VECTOR_COL = '_tsv';

export const dropTsVectorColumnQuery = (schema: string, table: string): string =>
  dropColumnQuery(schema, table, TS_VECTOR_COL);
export const createTsVectorColumnQuery = (
  schema: string,
  table: string,
  fields: string[],
  language = 'english'
): string => {
  const generated = `GENERATED ALWAYS as (to_tsvector('pg_catalog.${language}', ${fields
    .map((field) => `coalesce(${escapedName(field)}, '')`)
    .join(` || ' ' || `)})) STORED`;
  return createColumnQuery(schema, table, TS_VECTOR_COL, `tsvector ${generated}`);
};

export const createTsVectorCommentQuery = (schema: string, table: string): Query =>
  commentColumnQuery(schema, table, TS_VECTOR_COL, '@omit all');

const tsVectorIndexName = (schema: string, table: string) => hashName(schema, 'fulltext_idx', table);
export const dropTsVectorIndexQuery = (schema: string, table: string): string =>
  dropIndexQuery(schema, tsVectorIndexName(schema, table));

export const createTsVectorIndexQuery = (schema: string, table: string): string =>
  createIndexQuery({using: 'gist', fields: [TS_VECTOR_COL], name: tsVectorIndexName(schema, table)}, table, schema);

const searchFunctionName = (schema: string, table: string): string => hashName(schema, 'search', table);
export const dropSearchFunctionQuery = (schema: string, table: string): string =>
  dropFunction(schema, searchFunctionName(schema, table));
export const createSearchFunctionQuery = (schema: string, table: string): string => {
  const functionName = searchFunctionName(schema, table);
  return `
create or replace function ${escapedName(schema, functionName)}(search text)
  returns setof ${escapedName(schema, table)} as $$
    select *
    from ${escapedName(schema, table)} as "table"
    where "table"."${TS_VECTOR_COL}" @@ to_tsquery(search)
  $$ language sql stable;
  `;
};

export const commentSearchFunctionQuery = (schema: string, table: string): Query =>
  commentOnFunction(schema, searchFunctionName(schema, table), `@name search_${table}`);
