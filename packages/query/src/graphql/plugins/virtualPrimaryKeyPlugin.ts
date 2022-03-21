// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SchemaBuilder} from 'graphile-build';
import {QueryBuilder} from 'graphile-build-pg';
import {omit} from 'lodash';

export const primaryKey = 'pid'; // generated primary key

export default (builder: SchemaBuilder): void => {
  builder.hook('GraphQLObjectType:fields:field:args', (args, build) => {
    const {
      extend,
      graphql: {GraphQLNonNull, GraphQLString},
    } = build;

    const containIdField = Object.keys(args).includes(primaryKey);

    if (!containIdField) return args;

    // replace generated primary key with `id: String!` field instead
    return extend(omit(args, primaryKey), {
      id: {
        type: GraphQLNonNull(GraphQLString),
      },
    });
  });

  // query by `id` if provided
  builder.hook('GraphQLObjectType:fields:field', (field, {pgSql: sql}, {addArgDataGenerator}) => {
    addArgDataGenerator(function virtualPrimaryKey({id}: {id?: string}) {
      if (!id || !sql) return;

      return {
        pgQuery: (queryBuilder: QueryBuilder) => {
          queryBuilder.where(sql.fragment`${queryBuilder.getTableAlias()}.${sql.identifier('id')} = ${sql.value(id)}`);
        },
      };
    });

    return field;
  });

  // hide generated primary key
  builder.hook('GraphQLObjectType:fields', (fields, {inflection}) => {
    return omit(fields, [primaryKey, inflection.camelCase(primaryKey)]);
  });

  // also hide in the connection filter
  builder.hook('GraphQLInputObjectType:fields', (fields, {inflection}) => {
    return omit(fields, [primaryKey, inflection.camelCase(primaryKey)]);
  });
};
