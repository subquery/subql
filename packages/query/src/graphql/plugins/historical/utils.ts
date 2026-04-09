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

export function validateBlockRange(blockRange: string[]): [string, string] | null {
  if (!blockRange || blockRange.length !== 2) return null;

  const [start, end] = blockRange;
  const startNum = parseInt(start, 10);
  const endNum = parseInt(end, 10);

  if (isNaN(startNum) || isNaN(endNum)) return null;
  if (startNum < 0 || endNum < 0) return null;
  if (startNum > endNum) return null;

  return [start, end];
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
