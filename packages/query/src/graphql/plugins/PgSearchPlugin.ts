// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Tsquery} from 'pg-tsquery';

const parser = new Tsquery();

export const PgSearchPlugin: GraphileConfig.Plugin = {
  name: 'PgSearchPlugin',
  version: '0.0.0',
  schema: {
    hooks: {
      GraphQLObjectType_fields_field(field, _build, context) {
        const {
          scope: {pgFieldResource},
        } = context;
        if (!pgFieldResource?.parameters?.some((p: any) => p.name === 'search')) {
          return field;
        }
        const origPlan = field.plan;
        if (!origPlan) return field;
        field.plan = ($root, args: any, info) => {
          if (args?.search !== undefined) {
            // In v5, args are AccessorExpressions (lazy wrappers), not plain values.
            // Evaluate to get the raw string, sanitize it, then create a modified copy.
            const searchVal = typeof args.search === 'object' && args.search?.eval ? args.search.eval() : args.search;
            if (searchVal !== null && searchVal !== undefined) {
              try {
                const parsed = parser.parse(String(searchVal));
                const sanitized = parsed?.toString();
                if (sanitized !== undefined && sanitized !== null) {
                  args = {...args, search: sanitized};
                } else {
                  // parse returned null — unsafe to pass raw input, use empty
                  args = {...args, search: ''};
                }
              } catch {
                // parse threw — unsafe to pass raw input, use empty
                args = {...args, search: ''};
              }
            }
          }
          return origPlan.call(field, $root, args, info);
        };
        return field;
      },
    },
  },
};
