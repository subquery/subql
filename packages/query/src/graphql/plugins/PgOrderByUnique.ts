// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {PgClass} from '@subql/x-graphile-build-pg';
import {Plugin} from 'graphile-build';
import {GraphQLEnumType} from 'graphql';
import isString from 'lodash/isString';
import * as PgSql from 'pg-sql2';
import {argv} from '../../yargs';

const PgConnectionArgOrderBy: Plugin = (builder, {orderByNullsLast}) => {
  builder.hook(
    'init',
    (_, build) => {
      const {
        describePgEntity,
        graphql: {GraphQLEnumType},
        inflection,
        newWithHooks,
        pgIntrospectionResultsByKind: introspectionResultsByKind,
        pgOmit: omit,
        sqlCommentByAddingTags,
      } = build;

      introspectionResultsByKind.class.forEach((table: PgClass) => {
        // PERFORMANCE: These used to be .filter(...) calls
        if (!table.isSelectable || omit(table, 'order')) return;
        if (!table.namespace) return;
        const tableTypeName = inflection.tableType(table);
        // const TableOrderByType =
        newWithHooks(
          GraphQLEnumType,
          {
            name: inflection.orderByType(tableTypeName),
            description: build.wrapDescription(`Methods to use when ordering \`${tableTypeName}\`.`, 'type'),
            values: {
              [inflection.builtin('NATURAL')]: {
                value: {
                  alias: null,
                  specs: [],
                },
              },
            },
          },
          {
            __origin: `Adding connection "orderBy" argument for ${describePgEntity(
              table
            )}. You can rename the table's GraphQL type via a 'Smart Comment':\n\n  ${sqlCommentByAddingTags(table, {
              name: 'newNameHere',
            })}`,
            pgIntrospection: table,
            isPgRowSortEnum: true,
          }
        );
      });

      return _;
    },
    ['PgConnectionArgOrderBy']
  );

  builder.hook(
    'GraphQLObjectType:fields:field:args',
    (args, build, context) => {
      const {
        extend,
        getTypeByName,
        graphql: {GraphQLList, GraphQLNonNull},
        inflection,
        pgGetGqlTypeByTypeIdAndModifier,
        pgOmit: omit,
        pgSql: sql,
      } = build;
      const {
        Self,
        addArgDataGenerator,
        scope: {
          fieldName,
          isPgFieldConnection,
          isPgFieldSimpleCollection,
          pgFieldIntrospection,
          pgFieldIntrospectionTable,
        },
      } = context;

      if (!isPgFieldConnection && !isPgFieldSimpleCollection) {
        return args;
      }

      const proc = pgFieldIntrospection.kind === 'procedure' ? pgFieldIntrospection : null;
      const table: PgClass | null =
        pgFieldIntrospection.kind === 'class' ? pgFieldIntrospection : proc ? pgFieldIntrospectionTable : null;

      if (!table || !table.namespace || !table.isSelectable || omit(table, 'order')) {
        return args;
      }

      if (proc) {
        if (!proc.tags.sortable) {
          return args;
        }
      }

      const TableType = pgGetGqlTypeByTypeIdAndModifier(table.type.id, null);
      const tableTypeName = TableType.name;
      const TableOrderByType = getTypeByName(inflection.orderByType(tableTypeName)) as GraphQLEnumType;

      const cursorPrefixFromOrderBy = (orderBy: any) => {
        if (orderBy) {
          const cursorPrefixes: PgSql.SQLNode[] = [];

          for (let itemIndex = 0, itemCount = orderBy.length; itemIndex < itemCount; itemIndex++) {
            const item = orderBy[itemIndex];

            if (item.alias) {
              cursorPrefixes.push(sql.literal(item.alias));
            }
          }

          if (cursorPrefixes.length > 0) {
            return cursorPrefixes;
          }
        }

        return null;
      };

      addArgDataGenerator(function connectionOrderBy({orderBy: rawOrderBy}: any) {
        const orderBy = rawOrderBy ? (Array.isArray(rawOrderBy) ? rawOrderBy : [rawOrderBy]) : null;
        return {
          pgCursorPrefix: cursorPrefixFromOrderBy(orderBy),
          pgQuery: (queryBuilder) => {
            if (orderBy !== null) {
              orderBy.forEach((item) => {
                const {specs, unique} = item;
                const orders = Array.isArray(specs[0]) || specs.length === 0 ? specs : [specs];
                orders.forEach(([col, ascending, specNullsFirst]) => {
                  const expr = isString(col)
                    ? sql.fragment`${queryBuilder.getTableAlias()}.${sql.identifier(col)}`
                    : col;

                  // If the enum specifies null ordering, use that
                  // Otherwise, use the orderByNullsLast option if present
                  const nullsFirst =
                    specNullsFirst !== null
                      ? specNullsFirst
                      : orderByNullsLast !== null
                        ? !orderByNullsLast
                        : undefined;
                  queryBuilder.orderBy(expr, ascending, nullsFirst);
                });

                if (argv('dictionary-optimisation') || unique) {
                  queryBuilder.setOrderIsUnique();
                }
              });
            }
          },
        };
      });

      return extend(
        args,
        {
          orderBy: {
            description: build.wrapDescription(`The method to use when ordering \`${tableTypeName}\`.`, 'arg'),
            type: new GraphQLList(new GraphQLNonNull(TableOrderByType)),
          },
        },
        `Adding 'orderBy' argument to field '${fieldName}' of '${Self.name}'`
      );
    },
    ['PgConnectionArgOrderBy']
  );
};

export default PgConnectionArgOrderBy;
