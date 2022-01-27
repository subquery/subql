// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// overwrite the official plugin: https://github.com/graphile/graphile-engine/blob/v4/packages/graphile-build-pg/src/plugins/PgConnectionArgFirstLastBeforeAfter.js
// to support max record rewrite, which to prevent the db performance issue.

import {QueryBuilder} from 'graphile-build-pg';
import {argv} from '../../yargs';

const unsafe = argv('unsafe') as boolean;

const MAX_ENTITY_COUNT = 100;

const base64Decode = (str) => Buffer.from(String(str), 'base64').toString('utf8');
const safeClamp = (x: number) => (unsafe ? x : Math.min(x, MAX_ENTITY_COUNT));

export default (builder) => {
  builder.hook(
    'GraphQLObjectType:fields:field:args',
    (args, build, context) => {
      const {
        extend,
        getTypeByName,
        graphql: {GraphQLInt},
      } = build;
      const {
        Self,
        addArgDataGenerator,
        scope: {fieldName, isPgFieldConnection, isPgFieldSimpleCollection, pgFieldIntrospection: source},
      } = context;

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
          pgQuery: (queryBuilder: QueryBuilder) => {
            if (!first && !last && !unsafe) {
              queryBuilder.first(MAX_ENTITY_COUNT);
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
              try {
                const cursorValues = JSON.parse(base64Decode(cursor));
                return queryBuilder.addCursorCondition(cursorValues, isAfter);
              } catch (e) {
                throw new Error('Invalid cursor, please enter a cursor from a previous request, or null.');
              }
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
