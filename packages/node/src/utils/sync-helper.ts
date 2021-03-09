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
