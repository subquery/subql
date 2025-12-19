// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {PgEntity, PgEntityKind, SQL} from '@subql/x-graphile-build-pg';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeRangeQuery(tableName: SQL, blockHeight: SQL, sql: any): SQL {
  return sql.fragment`${tableName}._block_range @> ${blockHeight}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeBlockRangeQuery(tableName: SQL, blockRange: [string, string], sql: any): SQL {
  const [startBlock, endBlock] = blockRange;
  return sql.fragment`${tableName}._block_range && int8range(${sql.value(startBlock)}::bigint, ${sql.value(endBlock)}::bigint, '[]')`;
}

export function extractBlockHeightFromRange(blockRangeColumn: string): string {
  return `lower(${blockRangeColumn})`;
}

export function hasBlockRange(entity?: PgEntity): boolean {
  if (!entity) {
    return true;
  }

  switch (entity.kind) {
    case PgEntityKind.CLASS: {
      return entity.attributes.some(({name}) => name === '_block_range');
    }
    case PgEntityKind.CONSTRAINT: {
      return hasBlockRange(entity.class);
    }
    default:
      return true;
  }
}
