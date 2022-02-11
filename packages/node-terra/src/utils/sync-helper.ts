// Copyright 2020-2021 OnFinality Limited authors & contributors
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
  )} on ${schema}.${table} (${underscored(field)})`;
}
