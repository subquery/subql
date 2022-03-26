// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SchemaBuilder} from 'graphile-build';
import {QueryBuilder} from 'graphile-build-pg';
import {omit} from 'lodash';

export default (builder: SchemaBuilder): void => {
  const blockHeightField = '_$block_height';

  // add `blockHeight` argument only to the reasonable types and fields
  builder.hook('GraphQLObjectType:fields:field:args', (args, build, context) => {
    const {
      extend,
      graphql: {GraphQLInt},
    } = build;
    const {
      scope: {isConnectionType, isEdgeType, isPageInfo, isRootNodeField, pgFieldIntrospection: source},
    } = context;

    const isConnectionFields = isConnectionType || isEdgeType || isPageInfo;

    if (
      isRootNodeField || // root node use only `nodeId`, no need to add `blockHeight`
      isConnectionFields ||
      !source ||
      !(source.kind === 'class' || source.kind === 'procedure' || source.kind === 'constraint')
    ) {
      return args;
    }

    return extend(args, {
      blockHeight: {
        description: build.wrapDescription('The block height of yous preferred historical state', 'arg'),
        type: GraphQLInt,
      },
    });
  });

  // get the data of the preferred blockHeight
  builder.hook('GraphQLObjectType:fields:field', (field, {pgSql: sql}, {addArgDataGenerator}) => {
    addArgDataGenerator(function blockHeight({blockHeight, nodeId}: {blockHeight?: bigint; nodeId?: string}) {
      // ignore `blockHeight` if `nodeId` was provided
      if (nodeId || !sql) return;

      return {
        pgQuery: (queryBuilder: QueryBuilder) => {
          const blockHeightValue = blockHeight ?? queryBuilder.context.args?.blockHeight ?? 9223372036854775807n;
          queryBuilder.context.args = {blockHeight: blockHeightValue};

          queryBuilder.where(
            sql.fragment`${queryBuilder.getTableAlias()}.${sql.identifier(blockHeightField)} @> ${sql.value(
              blockHeightValue
            )}::bigint`
          );
        },
      };
    });

    return field;
  });

  // hide block height column
  builder.hook('GraphQLObjectType:fields', (fields, {inflection}) => {
    return omit(fields, [blockHeightField, inflection.camelCase(blockHeightField)]);
  });

  // also hide in the connection filter
  builder.hook('GraphQLInputObjectType:fields', (fields, {inflection}) => {
    return omit(fields, [blockHeightField, inflection.camelCase(blockHeightField)]);
  });
};
