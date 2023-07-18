// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

/* WARNING
 * This is a fork of https://github.com/graphile/pg-aggregates/blob/c8dd0f951663d5dacde21da26f3b94b62dc296c5/src/OrderByAggregatesPlugin.ts
 * The only modification is to filter out `_id` and `_block_height` attributes to fix a naming conflict
 */

import {AggregateSpec} from '@graphile/pg-aggregates/dist/interfaces';
import type {SQL, QueryBuilder, PgClass, PgEntity} from '@subql/x-graphile-build-pg';
import type {Plugin} from 'graphile-build';

type OrderBySpecIdentity = string | SQL | ((options: {queryBuilder: QueryBuilder}) => SQL);

type OrderSpec = [OrderBySpecIdentity, boolean] | [OrderBySpecIdentity, boolean, boolean];
export interface OrderSpecs {
  [orderByEnumValue: string]: {
    value: {
      alias?: string;
      specs: Array<OrderSpec>;
      unique: boolean;
    };
  };
}

const OrderByAggregatesPlugin: Plugin = (builder) => {
  builder.hook('GraphQLEnumType:values', (values, build, context) => {
    const {
      extend,
      inflection,
      pgIntrospectionResultsByKind: introspectionResultsByKind,
      pgOmit: omit,
      pgSql: sql,
    } = build;
    const pgAggregateSpecs: AggregateSpec[] = build.pgAggregateSpecs;
    const {
      scope: {isPgRowSortEnum},
    } = context;

    const pgIntrospection: PgEntity | undefined = context.scope.pgIntrospection;

    if (!isPgRowSortEnum || !pgIntrospection || pgIntrospection.kind !== 'class') {
      return values;
    }

    const foreignTable: PgClass = pgIntrospection;

    const foreignKeyConstraints = foreignTable.foreignConstraints.filter((con) => con.type === 'f');

    const newValues = foreignKeyConstraints.reduce((memo, constraint) => {
      if (omit(constraint, 'read')) {
        return memo;
      }
      const table: PgClass | undefined = introspectionResultsByKind.classById[constraint.classId];
      if (!table) {
        throw new Error(`Could not find the table that referenced us (constraint: ${constraint.name})`);
      }
      const keys = constraint.keyAttributes;
      const foreignKeys = constraint.foreignKeyAttributes;
      if (!keys.every((_) => _) || !foreignKeys.every((_) => _)) {
        throw new Error('Could not find key columns!');
      }
      if (keys.some((key) => omit(key, 'read'))) {
        return memo;
      }
      if (foreignKeys.some((key) => omit(key, 'read'))) {
        return memo;
      }
      const isUnique = !!table.constraints.find(
        (c) =>
          (c.type === 'p' || c.type === 'u') &&
          c.keyAttributeNums.length === keys.length &&
          c.keyAttributeNums.every((n, i) => keys[i].num === n)
      );
      if (isUnique) {
        // No point aggregating over a relation that's unique
        return memo;
      }

      const tableAlias = sql.identifier(Symbol(`${foreignTable.namespaceName}.${foreignTable.name}`));

      // Add count
      memo = build.extend(
        memo,
        orderByAscDesc(
          inflection.orderByCountOfManyRelationByKeys(keys, table, foreignTable, constraint),
          ({queryBuilder}) => {
            const foreignTableAlias = queryBuilder.getTableAlias();
            const conditions: SQL[] = [];
            keys.forEach((key, i) => {
              conditions.push(
                sql.fragment`${tableAlias}.${sql.identifier(key.name)} = ${foreignTableAlias}.${sql.identifier(
                  foreignKeys[i].name
                )}`
              );
            });
            return sql.fragment`(select count(*) from ${sql.identifier(
              table.namespaceName,
              table.name
            )} ${tableAlias} where (${sql.join(conditions, ' AND ')}))`;
          },
          false
        ),
        `Adding orderBy count to '${foreignTable.namespaceName}.${foreignTable.name}' using constraint '${constraint.name}'`
      );

      // Filter out attributes relating to historical. This was causing conflicts with `id` and `_id`
      const attributes = table.attributes.filter((attr) => attr.name !== '_id' && attr.name !== '_block_height');

      // Add other aggregates
      pgAggregateSpecs.forEach((spec) => {
        attributes.forEach((attr) => {
          memo = build.extend(
            memo,
            orderByAscDesc(
              inflection.orderByColumnAggregateOfManyRelationByKeys(keys, table, foreignTable, constraint, spec, attr),
              ({queryBuilder}) => {
                const foreignTableAlias = queryBuilder.getTableAlias();
                const conditions: SQL[] = [];
                keys.forEach((key, i) => {
                  conditions.push(
                    sql.fragment`${tableAlias}.${sql.identifier(key.name)} = ${foreignTableAlias}.${sql.identifier(
                      foreignKeys[i].name
                    )}`
                  );
                });
                return sql.fragment`(select ${spec.sqlAggregateWrap(
                  sql.fragment`${tableAlias}.${sql.identifier(attr.name)}`
                )} from ${sql.identifier(table.namespaceName, table.name)} ${tableAlias} where (${sql.join(
                  conditions,
                  ' AND '
                )}))`;
              },
              false
            ),
            `Adding orderBy ${spec.id} of '${attr.name}' to '${foreignTable.namespaceName}.${foreignTable.name}' using constraint '${constraint.name}'`
          );
        });
      });

      return memo;
    }, {} as OrderSpecs);

    return extend(values, newValues, `Adding aggregate orders to '${foreignTable.namespaceName}.${foreignTable.name}'`);
  });
};

export function orderByAscDesc(baseName: string, columnOrSqlFragment: OrderBySpecIdentity, unique = false): OrderSpecs {
  return {
    [`${baseName}_ASC`]: {
      value: {
        alias: `${baseName}_ASC`,
        specs: [[columnOrSqlFragment, true]],
        unique,
      },
    },
    [`${baseName}_DESC`]: {
      value: {
        alias: `${baseName}_DESC`,
        specs: [[columnOrSqlFragment, false]],
        unique,
      },
    },
  };
}

export default OrderByAggregatesPlugin;
