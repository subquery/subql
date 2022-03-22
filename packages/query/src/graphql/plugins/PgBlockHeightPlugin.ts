// Copyright 2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Plugin} from 'graphile-build';
import {QueryBuilder} from 'graphile-build-pg';
import {GraphQLString} from 'graphql';

export const PgBlockHeightPlugin: Plugin = (builder) => {
  // Adds blockHeight condition to join clause when joining a table that has _$block_height column
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
      }
    ) => {
      if (!isPgBackwardRelationField && !isPgForwardRelationField && !isPgBackwardSingleRelationField) {
        return field;
      }
      if (
        !pgFieldIntrospection?.attributes?.some(({name}) => name === '_$block_range') &&
        !pgFieldIntrospection?.class?.attributes?.some(({name}) => name === '_$block_range')
      ) {
        return field;
      }

      addArgDataGenerator(() => ({
        pgQuery: (queryBuilder: QueryBuilder) => {
          queryBuilder.where(
            sql.fragment`${queryBuilder.getTableAlias()}._$block_range @> ${queryBuilder.context.args.blockHeight}`
          );
        },
      }));
      return field;
    }
  );
  // Adds blockHeight argument to single entity and connection queries for tables with _$block_height column
  builder.hook(
    'GraphQLObjectType:fields:field:args',
    (
      args,
      {extend, pgSql: sql},
      {addArgDataGenerator, scope: {isPgFieldConnection, isPgRowByUniqueConstraintField, pgFieldIntrospection}}
    ) => {
      if (!isPgRowByUniqueConstraintField && !isPgFieldConnection) {
        return args;
      }
      if (
        !pgFieldIntrospection?.attributes?.some(({name}) => name === '_$block_range') &&
        !pgFieldIntrospection?.class?.attributes?.some(({name}) => name === '_$block_range')
      ) {
        return args;
      }

      addArgDataGenerator(({blockHeight}) => ({
        pgQuery: (queryBuilder: QueryBuilder) => {
          // Save blockHeight to context, so it gets passed down to children
          if (!queryBuilder.context.args?.blockHeight) {
            queryBuilder.context.args = {blockHeight: sql.fragment`${sql.value(blockHeight)}::bigint`};
          }
          queryBuilder.where(
            sql.fragment`${queryBuilder.getTableAlias()}._$block_range @> ${queryBuilder.context.args.blockHeight}`
          );
        },
      }));
      return extend(args, {
        blockHeight: {
          description: 'Block height',
          defaultValue: '9223372036854775807',
          type: GraphQLString, // String because of int overflow
        },
      });
    }
  );
};
