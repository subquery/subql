// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getYargsOption} from '../../yargs';

function getQueryLimit(): number {
  return getYargsOption().argv['query-limit'] as number;
}

function isUnsafe(): boolean {
  return getYargsOption().argv.unsafe as boolean;
}

export const PgConnectionFirstLastClampPlugin: GraphileConfig.Plugin = {
  name: 'PgConnectionFirstLastClampPlugin',
  version: '0.0.0',
  schema: {
    hooks: {
      GraphQLObjectType_fields_field_args(args, _build, context) {
        const {scope: {isPgFieldConnection, isPgFieldSimpleCollection} = {}} = context;
        if (!isPgFieldConnection && !isPgFieldSimpleCollection) return args;
        const queryLimit = getQueryLimit();
        if (isUnsafe() || queryLimit <= 0) return args;

        if (args.first) {
          (args.first as any).applyPlan = function (_parent: any, $connection: any, input: any, _info: any) {
            const $val = input.getRaw();
            const val = $val?.eval?.() ?? $val;
            if (val !== null && val !== undefined) {
              $connection.setFirst(Math.min(Number(val), queryLimit));
            }
          };
        }

        if (args.last) {
          (args.last as any).applyPlan = function (_parent: any, $connection: any, input: any, _info: any) {
            const $val = input.getRaw();
            const val = $val?.eval?.() ?? $val;
            if (val !== null && val !== undefined) {
              $connection.setLast(Math.min(Number(val), queryLimit));
            }
          };
        }

        return args;
      },
      GraphQLObjectType_fields_field(field, _build, context) {
        const {scope: {isPgFieldConnection, isPgFieldSimpleCollection} = {}} = context;
        if (!isPgFieldConnection && !isPgFieldSimpleCollection) return field;
        const queryLimit = getQueryLimit();
        if (isUnsafe() || queryLimit <= 0) return field;

        const origPlan = field.plan;
        if (!origPlan) return field;

        field.plan = ($root: any, args: any, info: any) => {
          // Check if first/last were provided BEFORE origPlan runs.
          // args is a grafast FieldArgs object; getRaw('first') returns the plan step.
          const rawFirst = typeof args?.getRaw === 'function' ? args.getRaw('first') : undefined;
          const rawLast = typeof args?.getRaw === 'function' ? args.getRaw('last') : undefined;
          const hasFirst =
            rawFirst !== null && rawFirst !== undefined && typeof rawFirst.eval === 'function'
              ? rawFirst.eval() !== undefined
              : rawFirst !== null && rawFirst !== undefined;
          const hasLast =
            rawLast !== null && rawLast !== undefined && typeof rawLast.eval === 'function'
              ? rawLast.eval() !== undefined
              : rawLast !== null && rawLast !== undefined;

          const result = origPlan.call(field, $root, args, info);

          // Default-first: only when neither first nor last was provided
          // (applyPlan runs after our wrapper returns, so getFirst() is not yet set)
          if (!hasFirst && !hasLast && typeof result?.setFirst === 'function') {
            result.setFirst(queryLimit);
          }

          return result;
        };

        return field;
      },
    },
  },
};
