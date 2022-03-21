// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { underscoredIf } from 'sequelize/lib/utils';

export function smartTags(tags: Record<string, string>): string {
  return Object.entries(tags)
    .map(([k, v]) => `@${k} ${v}`)
    .join('\n');
}

const underscored = (input) => underscoredIf(input, true);

export function getFkConstraint(tableName: string, foreignKey: string): string {
  return [tableName, foreignKey, 'fkey'].map(underscored).join('_');
}

export function getUniqConstraint(tableName: string, field: string): string {
  return [tableName, field, 'uindex'].map(underscored).join('_');
}

export function commentConstraintQuery(
  table: string,
  constraint: string,
  comment: string,
): string {
  return `COMMENT ON CONSTRAINT ${constraint} ON ${table} IS E'${comment}'`;
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
    payload TEXT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
      row = OLD;
    ELSE
      row = NEW;
    END IF;
    payload = json_build_object(
      'id', row.id,
      'mutation_type', TG_OP,
      '_entity', row)::text;
    IF (octet_length(payload) >= 8000) THEN
      payload = json_build_object(
        'id', row.id,
        'mutation_type', TG_OP,
        '_entity', NULL)::text;
    END IF;
    PERFORM pg_notify(
      CONCAT(TG_TABLE_SCHEMA, '.', TG_TABLE_NAME),
      payload);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;`;

export function createNotifyTrigger(schema: string, table: string): string {
  return `
DROP TRIGGER IF EXISTS ${schema}_${table}_notify_trigger
    ON "${schema}"."${table}";
CREATE TRIGGER ${schema}_${table}_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE
    ON "${schema}"."${table}"
    FOR EACH ROW EXECUTE FUNCTION send_notification();`;
}
