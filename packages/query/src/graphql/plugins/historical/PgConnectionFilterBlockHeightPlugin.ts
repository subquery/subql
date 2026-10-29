// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {GraphQLString} from 'graphql';
import {currentBlockHeight} from './requestContext';
import {hasBlockRange} from './utils';

const HEIGHT_DEFAULT = '9223372036854775807';

/**
 * Map: GraphQL filter type name (e.g. "TestHistoricalChildFilter") → boolean
 * indicating whether the underlying table has a _block_range column.
 * Built at schema-init time, used in GraphQLInputObjectType_fields to
 * identify relation-filter fields that need blockHeight injection.
 */
const filterTypeHasBlockRange = new Map<string, boolean>();

function getEffectiveBlockHeight(): string {
  return currentBlockHeight.getStore() ?? HEIGHT_DEFAULT;
}

/**
 * Create a Proxy over a PgCondition that intercepts `existsPlan` calls
 * to inject `_block_range @> blockHeight::bigint` into every EXISTS subquery.
 *
 * Also intercepts `notPlan`/`andPlan`/`orPlan` to wrap child PgConditions,
 * ensuring the injection works at any nesting depth (e.g. `$where.notPlan().existsPlan()`).
 */
function createBlockHeightProxy($condition: any, sql: any): any {
  return new Proxy($condition, {
    get(target: any, prop: string, receiver: any) {
      const val = Reflect.get(target, prop, receiver);

      // Intercept existsPlan to inject blockHeight into the EXISTS subquery.
      if (prop === 'existsPlan') {
        return (options: any) => {
          const $subQuery = val.call(target, options);
          const height = getEffectiveBlockHeight();
          $subQuery.where(sql`${$subQuery.alias}._block_range @> ${sql.value(height)}::bigint`);
          return $subQuery;
        };
      }

      // Wrap child conditions so they also intercept existsPlan.
      if (prop === 'notPlan' || prop === 'andPlan' || prop === 'orPlan') {
        return (...args: any[]) => {
          const child = val.call(target, ...args);
          return createBlockHeightProxy(child, sql);
        };
      }

      return typeof val === 'function' ? val.bind(target) : val;
    },
  });
}

export const PgConnectionFilterBlockHeightPlugin: GraphileConfig.Plugin = {
  name: 'PgConnectionFilterBlockHeightPlugin',
  version: '0.0.0',
  schema: {
    hooks: {
      init(_data: Record<string, never>, build: any): Record<string, never> {
        const {allPgCodecs, getGraphQLTypeNameByPgCodec, inflection} = build;
        for (const codec of allPgCodecs) {
          if (!codec.attributes) continue;
          const nodeTypeName = getGraphQLTypeNameByPgCodec(codec, 'output');
          if (!nodeTypeName) continue;
          const filterTypeName = inflection.filterType(nodeTypeName);
          filterTypeHasBlockRange.set(filterTypeName, hasBlockRange(codec));
        }
        return {};
      },

      GraphQLInputObjectType_fields(inFields: Record<string, any>, build: any, context: any): Record<string, any> {
        const {Self, scope} = context;
        const {foreignTable, isPgConnectionFilter, isPgConnectionFilterMany, pgCodec} = scope;

        // Determine whether this filter type's target table has _block_range.
        let shouldInject = false;
        if (isPgConnectionFilter && pgCodec?.attributes) {
          // Filter types (e.g. TestHistoricalFilter): we will check each field's type.
          shouldInject = true;
        }
        if (isPgConnectionFilterMany && foreignTable?.codec?.attributes) {
          // Filter-many types (e.g. TestHistoricalFilterMany): foreignTable directly known.
          shouldInject = hasBlockRange(foreignTable.codec);
        }
        if (!shouldInject) return inFields;

        const {sql} = build;

        // Build fields with filterBlockHeight FIRST so its apply runs
        // before relation filter fields (input object field order matters).
        let fields: Record<string, any>;
        if (isPgConnectionFilter) {
          fields = {
            filterBlockHeight: {
              type: GraphQLString,
              description:
                'Override blockHeight for relation filters within this filter block. ' +
                'Affects nested relation filter subqueries (backward, forward, every/some/none).',
              apply(_$where: any, value: string) {
                if (value === null || value === undefined) return;
                currentBlockHeight.enterWith(value);
              },
            },
            ...inFields,
          };
        } else {
          fields = {...inFields};
        }

        for (const [fieldName, fieldConfig] of Object.entries(fields)) {
          if (typeof fieldConfig.apply !== 'function') continue;

          const typeName: string | undefined = fieldConfig.type?.name;

          // For regular filter types, only wrap relation-filter fields
          // (those whose GraphQL type is a filter for another table that has _block_range).
          // Skip scalar filters (e.g. StringFilter, IntFilter), logical operators
          // (type === Self), and computed fields.
          if (isPgConnectionFilter) {
            if (!typeName || typeName === Self.name) continue;
            if (!filterTypeHasBlockRange.get(typeName)) continue;
          }
          // For FilterMany types (every/some/none), foreignTable already confirmed
          // has _block_range above, so wrap all apply functions.

          const origApply = fieldConfig.apply;
          fieldConfig.apply = function (this: any, $where: any, value: any) {
            const proxy = createBlockHeightProxy($where, sql);
            return origApply.call(this, proxy, value);
          };
        }

        return fields;
      },
    },
  },
};
