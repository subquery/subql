// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {PgEntity, PgEntityKind, SQL} from '@subql/x-graphile-build-pg';

export function makeRangeQuery(tableName: SQL, blockHeight: SQL, sql: any, isBlockRangeQuery = false): SQL {
  if (isBlockRangeQuery) {
    // For block range queries, we need to check if the table's _block_range overlaps with the provided range
    return sql.fragment`${tableName}._block_range && ${blockHeight}`;
  }
  return sql.fragment`${tableName}._block_range @> ${blockHeight}`;
}

// Used to filter out _block_range attributes
export function hasBlockRange(entity?: PgEntity): boolean {
  if (!entity) {
    return true;
  }

  switch (entity.kind) {
    case PgEntityKind.CLASS: {
      return entity.attributes.some(({name}) => name === '_block_range');
    }
    case PgEntityKind.CONSTRAINT: {
      return hasBlockRange(entity.class); // DOESNT WORK && notBlockRange(pgFieldIntrospection.foreignClass)
    }
    default:
      return true;
  }
}
