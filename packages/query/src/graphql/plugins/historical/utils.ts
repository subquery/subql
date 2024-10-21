// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {PgEntity, PgEntityKind, SQL} from '@subql/x-graphile-build-pg';

export function makeRangeQuery(tableName: SQL, blockFilter: SQL, sql: any, isBlockRangeQuery = false): SQL {
  if (isBlockRangeQuery && Array.isArray(blockFilter)) {
    const [startBlock, endBlock] = blockFilter;
    return sql.fragment`${tableName}._block_range @> int8range(${startBlock}, ${endBlock}, '[]')`;
  }

  return sql.fragment`${tableName}._block_range @> ${blockFilter}`;
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
