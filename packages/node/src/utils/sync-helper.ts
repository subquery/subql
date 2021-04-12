// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { snakeCase } from 'lodash';

export function smartTags(tags: Record<string, string>): string {
  return Object.entries(tags)
    .map(([k, v]) => `@${k} ${v}`)
    .join('\n');
}

export function getFkConstraint(tableName: string, foreignKey: string): string {
  return [tableName, foreignKey, 'fkey'].map(snakeCase).join('_');
}

export function getUniqConstraint(tableName: string, field: string): string {
  return [tableName, field, 'uindex'].map(snakeCase).join('_');
}

export function commentConstraintQuery(
  table: string,
  constraint: string,
  comment: string,
): string {
  return `comment on constraint ${constraint} on ${table} is E'${comment}'`;
}

export function createUniqueIndexQuery(
  schema: string,
  table: string,
  field: string,
): string {
  return `create unique index if not exists ${getUniqConstraint(
    table,
    field,
  )} on ${schema}.${table} (${snakeCase(field)})`;
}

export function createSubscriptionNotifyFunctionQuery(
  schema: string,
  table: string,
): string[] {
  return ['insert', 'update', 'delete'].map((method) => {
    return `CREATE OR REPLACE FUNCTION ${schema}.${table}_${method}()
    RETURNS trigger AS $$
DECLARE
    notification TEXT;
BEGIN
    notification = json_build_object( 'id',NEW.id, 'mutation_type', '${method}');
    PERFORM pg_notify(
            '${schema}_${table}',
            notification);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;
  });
}

export function createSubscriptionTrigger(
  schema: string,
  table: string,
): string[] {
  return ['insert', 'update', 'delete'].map((method) => {
    return `
DROP TRIGGER IF EXISTS ${schema}_${table}_${method}_trigger
    ON ${schema}.${table};
CREATE TRIGGER ${schema}_${table}_${method}_trigger
    AFTER ${method}
    ON ${schema}.${table}
    FOR EACH ROW
EXECUTE PROCEDURE ${schema}.${table}_${method}();`;
  });
}
