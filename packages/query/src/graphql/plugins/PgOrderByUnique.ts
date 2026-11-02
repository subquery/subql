// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getYargsOption} from '../../yargs';

export const PgOrderByUniquePlugin: GraphileConfig.Plugin = {
  name: 'PgOrderByUniquePlugin',
  version: '0.0.0',
  schema: {
    hooks: {
      GraphQLEnumType_values(values: any, build: any, context: any) {
        const {extend} = build;
        const {
          scope: {isPgRowSortEnum},
        } = context;
        if (!isPgRowSortEnum) return values;
        if (values.NATURAL) return values;
        return extend(
          values,
          {
            NATURAL: {
              value: 'NATURAL',
              description: 'Use natural table order (no ORDER BY is applied).',
              extensions: {
                grafast: {
                  apply: () => {},
                },
              },
            },
          },
          'PgOrderByUniquePlugin.Natural'
        );
      },

      GraphQLObjectType_fields_field(field: any, _build: any, context: any) {
        const scope = context.scope as any;
        if (!scope.isPgFieldConnection && !scope.isPgFieldSimpleCollection) return field;
        const origPlan = field.plan;
        if (!origPlan) return field;

        field.plan = function ($parent: any, args: any, ...rest: any[]) {
          const $connection = origPlan.call(this, $parent, args, ...rest);
          const $select = $connection?.getSubplan?.();
          if (!$select) return $connection;

          // --dictionary-optimisation: tell PgSelectStep order is already unique,
          // skip PK tiebreaker from makeOrderUniqueIfPossible()
          if (getYargsOption().argv['dictionary-optimisation']) {
            ($select as any).setOrderIsUnique();
          }

          // Read flag inline at plan-time (not module-scope) so tests can mock it
          const orderByNullsLast = getYargsOption().argv['order-by-nulls-last'] as boolean | undefined;

          // If no orderByNull arg provided and no yargs default, nothing to do
          const orderByNullStep = args?.getRaw?.('orderByNull');
          if (!orderByNullStep && orderByNullsLast === undefined) {
            return $connection;
          }

          // Wrap orderBy on $select to apply nulls after
          if (typeof $select.orderBy === 'function') {
            const origOrderBy = $select.orderBy.bind($select);
            $select.orderBy = (spec: any) => {
              let nulls: string | undefined;
              if (orderByNullStep) {
                const v =
                  typeof (orderByNullStep as any).eval === 'function'
                    ? (orderByNullStep as any).eval()
                    : orderByNullStep;
                nulls = v === 'NULLS_FIRST' ? 'FIRST' : v === 'NULLS_LAST' ? 'LAST' : undefined;
              } else if (orderByNullsLast !== undefined) {
                nulls = orderByNullsLast ? 'LAST' : 'FIRST';
              }
              if (nulls) origOrderBy({...spec, nulls});
              else origOrderBy(spec);
            };
          }

          return $connection;
        };
        return field;
      },

      init(_data, build) {
        build.registerEnumType(
          'NullOrder',
          {},
          () => ({
            description: 'Options for ordering null values in a specific direction.',
            values: {
              NULLS_FIRST: {
                description: 'Order null values first.',
                value: 'NULLS_FIRST',
              },
              NULLS_LAST: {
                description: 'Order null values last.',
                value: 'NULLS_LAST',
              },
            },
          }),
          'PgOrderByUniquePlugin.NullOrder'
        );
        return _data;
      },
      GraphQLObjectType_fields_field_args(args, build, context) {
        const {extend, getTypeByName} = build;
        const {scope: {isPgFieldConnection, isPgFieldSimpleCollection} = {}} = context;

        if (!isPgFieldConnection && !isPgFieldSimpleCollection) return args;
        const nullOrderType = getTypeByName('NullOrder');
        if (!nullOrderType) return args;

        return extend(
          args,
          {
            orderByNull: {
              description: 'Specify ordering of null values (NULLS_FIRST or NULLS_LAST).',
              type: nullOrderType,
            },
          },
          'PgOrderByUniquePlugin'
        );
      },
    },
  },
};
