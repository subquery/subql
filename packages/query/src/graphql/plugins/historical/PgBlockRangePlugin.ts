// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {QueryBuilder} from '@subql/x-graphile-build-pg';
import {Plugin, Context} from 'graphile-build';
import {GraphQLList, GraphQLString} from 'graphql';
import {fetchFromTable} from '../GetMetadataPlugin';
import {hasBlockRange, makeBlockRangeQuery, extractBlockHeightFromRange} from './utils';

function addBlockRangeQuery(queryBuilder: QueryBuilder, sql: any, blockRange: [string, string]) {
  const tableAlias = queryBuilder.getTableAlias();
  const rangeQuery = makeBlockRangeQuery(tableAlias, blockRange, sql);
  queryBuilder.where(rangeQuery);
}

function addBlockRangeContext(queryBuilder: QueryBuilder, sql: any, blockRange: [string, string]) {
  if (!queryBuilder.context.args?.blockRange || !queryBuilder.parentQueryBuilder) {
    queryBuilder.context.args = {
      ...queryBuilder.context.args,
      blockRange: [
        sql.fragment`${sql.value(blockRange[0])}::bigint`,
        sql.fragment`${sql.value(blockRange[1])}::bigint`,
      ],
      isBlockRangeQuery: true,
    };
  }
}

function enhanceQueryForBlockRange(queryBuilder: QueryBuilder, sql: any) {
  const alias = queryBuilder.getTableAlias();
  queryBuilder.select(sql.fragment`lower(${alias}._block_range)`, '__block_height');
}

export const PgBlockRangePlugin: Plugin = async (builder, options) => {
  let historicalMode: boolean | 'height' | 'timestamp' = 'height';
  const [schemaName] = options.pgSchemas;

  try {
    const {historicalStateEnabled} = await fetchFromTable(options.pgConfig, schemaName, undefined, false);
    historicalMode = historicalStateEnabled;
  } catch (e) {
    /* Do nothing, default value is already set */
  }

  builder.hook(
    'GraphQLObjectType:fields:field',
    (
      field,
      {pgSql: sql},
      {
        addArgDataGenerator,
        scope: {
          isPgBackwardRelationField,
          isPgBackwardSingleRelationField,
          isPgForwardRelationField,
          pgFieldIntrospection,
        },
      }: Context<any>
    ) => {
      if (!isPgBackwardRelationField && !isPgForwardRelationField && !isPgBackwardSingleRelationField) {
        return field;
      }
      if (!hasBlockRange(pgFieldIntrospection)) {
        return field;
      }

      addArgDataGenerator(({blockHeight, blockRange, timestamp}) => {
        if (!blockRange || blockRange.length !== 2) {
          return {};
        }

        const hasExplicitBlockHeight = blockHeight && blockHeight !== '9223372036854775807';
        const hasExplicitTimestamp = timestamp && timestamp !== '9223372036854775807';

        if (hasExplicitBlockHeight || hasExplicitTimestamp) {
          console.warn('blockRange cannot be used together with blockHeight or timestamp. blockRange will be ignored.');
          return {};
        }

        const [start, end] = blockRange;
        const startNum = parseInt(start, 10);
        const endNum = parseInt(end, 10);

        if (isNaN(startNum) || isNaN(endNum)) {
          console.warn('blockRange values must be valid numbers. blockRange will be ignored.');
          return {};
        }

        if (startNum < 0 || endNum < 0) {
          console.warn('blockRange values must be non-negative. blockRange will be ignored.');
          return {};
        }

        if (startNum > endNum) {
          console.warn('blockRange start must be less than or equal to end. blockRange will be ignored.');
          return {};
        }

        return {
          pgQuery: (queryBuilder: QueryBuilder) => {
            addBlockRangeContext(queryBuilder, sql, [start, end]);
            addBlockRangeQuery(queryBuilder, sql, [start, end]);
            enhanceQueryForBlockRange(queryBuilder, sql);
          },
        };
      });
      return field;
    }
  );

  builder.hook(
    'GraphQLObjectType:fields:field:args',
    (
      args,
      {extend, pgSql: sql},
      {
        addArgDataGenerator,
        scope: {isPgFieldConnection, isPgRowByUniqueConstraintField, pgFieldIntrospection},
      }: Context<any>
    ) => {
      if (!isPgRowByUniqueConstraintField && !isPgFieldConnection) {
        return args;
      }
      if (!hasBlockRange(pgFieldIntrospection)) {
        return args;
      }

      addArgDataGenerator(({blockHeight, blockRange, timestamp}) => {
        if (!blockRange || blockRange.length !== 2) {
          return {};
        }

        // Check for explicit blockHeight/timestamp (ignore default values)
        const hasExplicitBlockHeight = blockHeight && blockHeight !== '9223372036854775807';
        const hasExplicitTimestamp = timestamp && timestamp !== '9223372036854775807';

        if (hasExplicitBlockHeight || hasExplicitTimestamp) {
          console.warn('blockRange cannot be used together with blockHeight or timestamp. blockRange will be ignored.');
          return {};
        }

        const [start, end] = blockRange;
        const startNum = parseInt(start, 10);
        const endNum = parseInt(end, 10);

        if (isNaN(startNum) || isNaN(endNum)) {
          console.warn('blockRange values must be valid numbers. blockRange will be ignored.');
          return {};
        }

        if (startNum < 0 || endNum < 0) {
          console.warn('blockRange values must be non-negative. blockRange will be ignored.');
          return {};
        }

        if (startNum > endNum) {
          console.warn('blockRange start must be less than or equal to end. blockRange will be ignored.');
          return {};
        }

        return {
          pgQuery: (queryBuilder: QueryBuilder) => {
            addBlockRangeContext(queryBuilder, sql, [start, end]);
            addBlockRangeQuery(queryBuilder, sql, [start, end]);
            enhanceQueryForBlockRange(queryBuilder, sql);
          },
        };
      });

      return extend(args, {
        blockRange: {
          description:
            'When specified, returns all historical states within this block range [start, end]. Results will be keyed by block height.',
          type: new GraphQLList(GraphQLString), // array of two strings: [start, end]
        },
      });
    }
  );
};
