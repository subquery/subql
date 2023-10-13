// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {hashName, blake2AsHex} from '@subql/utils';
import {QueryTypes, Sequelize, Utils} from '@subql/x-sequelize';

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

export function commentConstraintQuery(table: string, constraint: string, comment: string): string {
  return `COMMENT ON CONSTRAINT ${constraint} ON ${table} IS E'${comment}'`;
}

export function commentTableQuery(column: string, comment: string): string {
  return `COMMENT ON TABLE ${column} IS E'${comment}'`;
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
CREATE TRIGGER "${triggerName}"
    AFTER INSERT OR UPDATE OR DELETE
    ON "${schema}"."${table}"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".send_notification('${channelName}');`;
}

export function dropNotifyTrigger(schema: string, table: string): string {
  const triggerName = hashName(schema, 'notify_trigger', table);
  return `DROP TRIGGER IF EXISTS "${triggerName}"
    ON "${schema}"."${table}";`;
}

export function dropNotifyFunction(schema: string): string {
  return `DROP FUNCTION IF EXISTS "${schema}".send_notification()`;
}

// Hot schema reload, _metadata table
export function createSchemaTrigger(schema: string, metadataTableName: string): string {
  const triggerName = hashName(schema, 'schema_trigger', metadataTableName);
  return `
  CREATE TRIGGER "${triggerName}"
    AFTER UPDATE
    ON "${schema}"."${metadataTableName}"
    FOR EACH ROW
    WHEN ( new.key = 'schemaMigrationCount')
    EXECUTE FUNCTION "${schema}".schema_notification()`;
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

// SQL improvement
const DEFAULT_SQL_EXE_BATCH = 2000;

/**
 * Improve SQL which could potentially increase DB IO significantly,
 * this executes it by batch size, and in ASC id order
 **/
export const sqlIterator = (tableName: string, sql: string, batch: number = DEFAULT_SQL_EXE_BATCH) => {
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
