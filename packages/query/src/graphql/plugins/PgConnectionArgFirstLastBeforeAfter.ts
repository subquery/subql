// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// overwrite the official plugin: https://github.com/graphile/graphile-engine/blob/v4/packages/graphile-build-pg/src/plugins/PgConnectionArgFirstLastBeforeAfter.js
// to support max record rewrite, which to prevent the db performance issue.
// It also replaces the upstream cursor comparator for ordered connections, because that loses rows with NULL sort values.

import {QueryBuilder} from '@subql/x-graphile-build-pg';
import {argv} from '../../yargs';

const base64Decode = (str) => Buffer.from(String(str), 'base64').toString('utf8');

/**
 * Builds the condition for the rows past a cursor. The upstream comparator uses
 * `expr > value OR (expr = value AND ...)`, which is NULL when either side is NULL, so rows with a NULL sort value can
 * never follow a cursor and nothing can follow a NULL cursor.
 *
 * Every condition here is true or false, never NULL, because hasNextPage and hasPreviousPage also use it inside `NOT`.
 * NOT NULL columns skip the NULL handling because an extra OR would stop them from using an ordered index scan.
 */
function buildCursorFilter(
  sql,
  orderBy: ReturnType<QueryBuilder['getOrderByExpressionsAndDirections']>,
  values: unknown[],
  isAfter: boolean,
  isFlipped: boolean,
  isNotNull: (expr) => boolean
) {
  let filter = sql.fragment`false`;

  for (let i = orderBy.length - 1; i >= 0; i--) {
    const [expr, ascending, orderNullsFirst] = orderBy[i];

    // Cursors with fewer values than order keys can't match anything for the missing keys
    if (i >= values.length) {
      filter = sql.fragment`false`;
      continue;
    }

    const value = values[i];
    // A flipped order holds the inverse of the requested NULL position, see PgOrderByUnique
    const hasNullOrder = orderNullsFirst !== null && orderNullsFirst !== undefined;
    const nullsFirst = hasNullOrder ? orderNullsFirst !== isFlipped : !ascending;
    const nullsAreAhead = isAfter ? !nullsFirst : nullsFirst;
    const comparison = ascending === isAfter ? sql.fragment`>` : sql.fragment`<`;

    let isPast;
    let isEqual;
    if (value === null) {
      isPast = nullsAreAhead ? sql.fragment`false` : sql.fragment`${expr} IS NOT NULL`;
      isEqual = sql.fragment`${expr} IS NULL`;
    } else if (isNotNull(expr)) {
      isPast = sql.fragment`${expr} ${comparison} ${sql.value(value)}`;
      isEqual = sql.fragment`${expr} = ${sql.value(value)}`;
    } else {
      isPast = nullsAreAhead
        ? sql.fragment`(${expr} IS NULL OR ${expr} ${comparison} ${sql.value(value)})`
        : sql.fragment`(${expr} IS NOT NULL AND ${expr} ${comparison} ${sql.value(value)})`;
      isEqual = sql.fragment`(${expr} IS NOT NULL AND ${expr} = ${sql.value(value)})`;
    }

    filter = sql.fragment`(${isPast} OR (${isEqual} AND ${filter}))`;
  }

  return filter;
}

export default (builder) => {
  builder.hook(
    'GraphQLObjectType:fields:field:args',
    (args, build, context) => {
      const {
        extend,
        getTypeByName,
        graphql: {GraphQLInt},
        pgSql: sql,
      } = build;
      const {
        Self,
        addArgDataGenerator,
        scope: {fieldName, isPgFieldConnection, isPgFieldSimpleCollection, pgFieldIntrospection: source},
      } = context;
      const unsafe = argv('unsafe') as boolean;
      const safeClamp = (x: number) => Math.min(x, argv('query-limit') as number);

      if (
        !(isPgFieldConnection || isPgFieldSimpleCollection) ||
        !source ||
        (source.kind !== 'class' && source.kind !== 'procedure')
      ) {
        return args;
      }
      const Cursor = getTypeByName('Cursor');

      addArgDataGenerator(function connectionFirstLastBeforeAfter({after, before, first, last, offset}) {
        return {
          pgQuery: (queryBuilder: QueryBuilder, resolveData) => {
            if (!first && !last && !unsafe) {
              queryBuilder.first(argv('query-limit') as number);
            }
            if (first) {
              first = safeClamp(first);
              queryBuilder.first(first);
            }
            if (offset) {
              queryBuilder.offset(offset);
            }
            if (isPgFieldConnection) {
              if (after) {
                addCursorConstraint(after, true);
              }
              if (before) {
                addCursorConstraint(before, false);
              }
              if (last) {
                if (first) {
                  throw new Error("We don't support setting both first and last");
                }
                if (offset) {
                  throw new Error("We don't support setting both offset and last");
                }
                last = safeClamp(last);
                queryBuilder.last(last);
              }
            }

            function addCursorConstraint(cursor, isAfter) {
              let cursorValues;
              try {
                cursorValues = JSON.parse(base64Decode(cursor));
              } catch {
                throw new Error('Invalid cursor, please enter a cursor from a previous request, or null.');
              }
              queryBuilder.beforeLock('whereBound', () => applyCursor(cursorValues, isAfter));
            }

            function applyCursor(cursorValues, isAfter: boolean) {
              const orderBy = queryBuilder.getOrderByExpressionsAndDirections();

              // Without an order, cursors are row positions and the upstream comparator handles them
              if (!orderBy.length) {
                queryBuilder.lock('cursorComparator');
                (queryBuilder as any).compiledData.cursorComparator(cursorValues, isAfter);
                return;
              }

              if (!queryBuilder.isOrderUnique()) {
                throw new Error(
                  'The order supplied is not unique, so before/after cursors cannot be used. Please ensure the supplied order includes all the columns from the primary key or a unique constraint.'
                );
              }

              const givenPrefixes = cursorValues.slice(0, cursorValues.length - 1);
              const values = cursorValues[cursorValues.length - 1];
              const orderPrefixes = resolveData.pgCursorPrefix?.filter(Boolean);
              const prefixes = orderPrefixes?.length
                ? orderPrefixes
                : (queryBuilder as any).data.cursorPrefix.map((prefix: string) => sql.literal(prefix));

              if (givenPrefixes.length !== prefixes.length || !Array.isArray(values)) {
                queryBuilder.whereBound(sql.fragment`false`, isAfter);
                return;
              }

              const filter = buildCursorFilter(sql, orderBy, values, isAfter, !!last, isNotNullColumn);
              const sqlGivenPrefixes = givenPrefixes.map((prefix) => sql.value(prefix));
              queryBuilder.whereBound(
                sql.fragment`(((${sql.join(prefixes, ', ')}) = (${sql.join(sqlGivenPrefixes, ', ')})) AND ${filter})`,
                isAfter
              );
            }

            function isNotNullColumn(expr): boolean {
              if (source.kind !== 'class') return false;
              // The table alias goes first so it always compiles to the same name, which stops another table's column matching
              const alias = queryBuilder.getTableAlias();
              const compile = (column) => sql.compile(sql.fragment`${alias}, ${column}`).text;
              const text = compile(expr);
              return source.attributes.some(
                (attr) => attr.isNotNull && text === compile(sql.fragment`${alias}.${sql.identifier(attr.name)}`)
              );
            }
          },
        };
      });

      return extend(
        args,
        {
          first: {
            description: build.wrapDescription('Only read the first `n` values of the set.', 'arg'),
            type: GraphQLInt,
          },
          ...(isPgFieldConnection
            ? {
                last: {
                  description: build.wrapDescription('Only read the last `n` values of the set.', 'arg'),
                  type: GraphQLInt,
                },
              }
            : null),
          offset: {
            description: build.wrapDescription(
              isPgFieldConnection
                ? 'Skip the first `n` values from our `after` cursor, an alternative to cursor based pagination. May not be used with `last`.'
                : 'Skip the first `n` values.',
              'arg'
            ),
            type: GraphQLInt,
          },
          ...(isPgFieldConnection
            ? {
                before: {
                  description: build.wrapDescription('Read all values in the set before (above) this cursor.', 'arg'),
                  type: Cursor,
                },
                after: {
                  description: build.wrapDescription('Read all values in the set after (below) this cursor.', 'arg'),
                  type: Cursor,
                },
              }
            : null),
        },
        isPgFieldConnection
          ? `Adding connection pagination args to field '${fieldName}' of '${Self.name}'`
          : `Adding simple collection args to field '${fieldName}' of '${Self.name}'`
      );
    },
    ['PgConnectionArgFirstLastBeforeAfter']
  );
};
