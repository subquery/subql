// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { underscoredIf } from 'sequelize/lib/utils';

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

const byTagOrder = (a: [string, any], b: [string, any]) => {
  return tagOrder[a[0]] - tagOrder[b[0]];
};

export function smartTags(tags: SmartTags, separator = '\n'): string {
  return Object.entries(tags)
    .sort(byTagOrder)
    .map(([k, v]) => `@${k} ${v}`)
    .join(separator);
}

export function getVirtualFkTag(field: string, to: string) {
  return `(${underscored(field)}) REFERENCES ${to} (id)`;
}

const underscored = (input) => underscoredIf(input, true);

export function getFkConstraint(tableName: string, foreignKey: string): string {
  return [tableName, foreignKey, 'fkey'].map(underscored).join('_');
}

export function getUniqConstraint(tableName: string, field: string): string {
  return [tableName, field, 'uindex'].map(underscored).join('_');
}

function getExcludeConstraint(tableName: string): string {
  return [tableName, '_id', '_block_range', 'exclude']
    .map(underscored)
    .join('_');
}

export function commentConstraintQuery(
  table: string,
  constraint: string,
  comment: string,
): string {
  return `COMMENT ON CONSTRAINT ${constraint} ON ${table} IS E'${comment}'`;
}

export function commentTableQuery(column: string, comment: string): string {
  return `COMMENT ON TABLE ${column} IS E'${comment}'`;
}

export function addTagsToForeignKeyMap(
  map: Map<string, Map<string, SmartTags>>,
  tableName: string,
  foreignKey: string,
  newTags: SmartTags,
): void {
  if (!map.has(tableName)) {
    map.set(tableName, new Map<string, SmartTags>());
  }
  const tableKeys = map.get(tableName);
  let foreignKeyTags = tableKeys.get(foreignKey) || ({} as SmartTags);
  foreignKeyTags = Object.assign(foreignKeyTags, newTags);
  tableKeys.set(foreignKey, foreignKeyTags);
}

export const BTREE_GIST_EXTENSION_EXIST_QUERY = `SELECT * FROM pg_extension where extname = 'btree_gist'`;

export function createExcludeConstraintQuery(
  schema: string,
  table: string,
): string {
  const constraint = getExcludeConstraint(table);
  return `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${constraint}') THEN
        ALTER TABLE "${schema}"."${table}" ADD CONSTRAINT ${constraint} EXCLUDE USING gist (id WITH =, _block_range WITH &&);
      END IF;
    END;
    $$`;
}

export function createUniqueIndexQuery(
  schema: string,
  table: string,
  field: string,
): string {
  return `create unique index if not exists '${getUniqConstraint(
    table,
    field,
  )}' on '${schema}.${table}' (${underscored(field)})`;
}

export const createSendNotificationTriggerFunction = `
CREATE OR REPLACE FUNCTION send_notification()
    RETURNS trigger AS $$
DECLARE
    row RECORD;
    payload JSONB;
BEGIN
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
      CONCAT(TG_TABLE_SCHEMA, '.', TG_TABLE_NAME),
      payload::text);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;`;

export function dropNotifyTrigger(schema: string, table: string): string {
  return `DROP TRIGGER IF EXISTS "${schema}_${table}_notify_trigger"
    ON "${schema}"."${table}";`;
}

export function getNotifyTriggers(): string {
  return `select trigger_name as "triggerName", event_manipulation as "eventManipulation" from information_schema.triggers
          WHERE trigger_name = :triggerName`;
}
export function createNotifyTrigger(schema: string, table: string): string {
  return `
CREATE TRIGGER "${schema}_${table}_notify_trigger"
    AFTER INSERT OR UPDATE OR DELETE
    ON "${schema}"."${table}"
    FOR EACH ROW EXECUTE FUNCTION send_notification();`;
}
