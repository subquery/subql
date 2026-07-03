// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {currentBlockHeight} from './requestContext';

const HEIGHT_DEFAULT = '9223372036854775807';

function hasBlockRange(codec: any): boolean {
  return '_block_range' in (codec?.attributes ?? {});
}

function getSelectStep(step: any): any {
  // Connection fields wrap PgSelectStep inside ConnectionStep;
  // use getSubplan() to unwrap.
  if (step?.getSubplan?.()) return step.getSubplan();
  // PgSelectSingleStep wraps PgSelectStep; getClassStep() unwraps.
  if (step?.getClassStep?.()) return step.getClassStep();
  return step;
}

/**
 * Resolve the codec (table attributes) for a field from its v5 scope.
 *
 * v5 scope structure differs by field type:
 * - Connection/all-rows: scope.pgFieldCodec or scope.pgFieldResource.codec
 * - Single relation (forward/backward unique): scope.pgRelationDetails → relation.remoteResource.codec
 * - Many-relation connection: scope.pgFieldCodec or scope.pgFieldResource.codec
 * - ByUnique constraint (profileByHistId): scope.pgFieldResource.codec (set on some builds)
 * - ById primary key (testHistoricalById): scope has only {fieldName, isRootQuery} —
 *   no pgFieldResource/pgFieldCodec. Must resolve via build.pgResources + inflection.
 */
function resolveCodecFromScope(scope: any): any {
  // Direct codec/resource (connections, many-relation, some ByUnique)
  const direct = scope.pgFieldCodec ?? scope.pgFieldResource?.codec;
  if (direct) return direct;

  // Single relation fields: go through pgRelationDetails
  if (scope.pgRelationDetails) {
    const {codec, registry, relationName} = scope.pgRelationDetails;
    const relation = registry?.pgRelations?.[codec?.name]?.[relationName];
    if (relation?.remoteResource?.codec) return relation.remoteResource.codec;
  }

  return null;
}

/**
 * Fallback codec resolution for root query fields that lack scope metadata.
 * Iterates build.pgResources and uses inflection to match fieldName → resource.codec.
 * Covers ById (PK) and ByUniqueConstraint fields.
 */
function resolveCodecForRootQuery(scope: any, build: any): any {
  if (!scope.isRootQuery) return null;
  const fieldName = scope.fieldName;
  if (!fieldName) return null;

  const resources = Object.values(build.pgResources) as any[];
  // Match via rowByUnique inflection (e.g. "testHistorical", "profileByHistId")
  for (const resource of resources) {
    if (resource.parameters || !resource.codec?.attributes || !resource.uniques) continue;
    for (const unique of resource.uniques) {
      try {
        if (build.inflection.rowByUnique({unique, resource}) === fieldName) {
          return resource.codec;
        }
      } catch {
        // inflection may fail, skip
      }
    }
  }

  // Match via nodeById inflection (e.g. "testHistoricalById" from NodeAccessorPlugin)
  // nodeById(typeName) returns the field name for Node ID accessor fields.
  // Map typeName → codec via build.pgResources.
  if (typeof build.inflection.nodeById === 'function') {
    for (const resource of resources) {
      if (resource.parameters || !resource.codec?.attributes) continue;
      try {
        const typeName = build.inflection.tableType(resource.codec);
        if (build.inflection.nodeById(typeName) === fieldName) {
          return resource.codec;
        }
      } catch {
        // inflection may fail, skip
      }
    }
  }

  return null;
}

/**
 * Resolve inherited block height from parent step chain.
 * Checks $parent itself, then PgSelectStep, then ConnectionStep subplan.
 */
function resolveInheritedHeight($parent: any): string | undefined {
  let parentHeight = parentBlockHeightMap.get($parent);
  if (parentHeight === undefined && $parent?.getClassStep) {
    parentHeight = parentBlockHeightMap.get($parent.getClassStep());
  }
  if (parentHeight === undefined && $parent?.getSubplan) {
    parentHeight = parentBlockHeightMap.get($parent.getSubplan());
  }
  const alsHeight = currentBlockHeight.getStore();
  return parentHeight ?? alsHeight;
}

/**
 * Determine effective block height from args or inherited height.
 * Priority: explicit blockHeight arg > explicit timestamp arg > inherited > default.
 */
function resolveEffectiveHeight(args: any, inheritedHeight: string | undefined): string {
  const bhStep = args?.getRaw?.('blockHeight');
  const tsStep = args?.getRaw?.('timestamp');
  const bhExplicit = bhStep && (bhStep as any).constructor?.name !== 'ConstantStep';
  const tsExplicit = tsStep && (tsStep as any).eval?.() !== null && (tsStep as any).eval?.() !== undefined;

  if (bhExplicit) {
    const bhVal = (bhStep as any).eval?.() ?? bhStep;
    return String(bhVal);
  }
  if (tsExplicit) {
    const tsVal = (tsStep as any).eval?.() ?? tsStep;
    return String(tsVal);
  }
  return inheritedHeight ?? HEIGHT_DEFAULT;
}

/**
 * Check if a v5 scope represents a relevant field type for block height filtering.
 *
 * v5 replaced v4's separate flags with unified ones:
 * - isPgFieldConnection: all-rows connections + many-relation connections
 * - isPgSingleRelationField: forward AND backward unique (single) relations
 * - isPgManyRelationConnectionField: backward many-relation connections
 * - isPgManyRelationListField: backward many-relation lists
 * - fieldBehaviorScope "query:resource:single": ByUnique constraint fields (e.g. profileByHistId)
 * - isRootQuery with no pgFieldResource: ById PK fields (e.g. testHistoricalById)
 */
function isRelevantField(scope: any): boolean {
  return !!(
    scope.isPgFieldConnection ||
    scope.isPgManyRelationConnectionField ||
    scope.isPgManyRelationListField ||
    scope.isPgSingleRelationField ||
    scope.fieldBehaviorScope === 'query:resource:single' ||
    // Root query ById fields: only {fieldName, isRootQuery} in scope
    (scope.isRootQuery && !scope.pgFieldResource && !scope.pgFieldCodec && !scope.pgRelationDetails)
  );
}

function applyBlockRangeFilter($select: any, heightVal: string): void {
  if ($select?.where) {
    const alias = $select.alias;
    $select.where(($sql: any) => $sql`${alias}._block_range @> ${$sql.value(heightVal)}::bigint`);
  }
}

// WeakMap keyed by the PgSelectStep, storing the blockHeight step.
// Accessed by PgAggregatesHistoricalPlugin to inject blockHeight into
// aggregate orderBy subqueries.
export const blockHeightStepMap = new WeakMap<object, any>();

// WeakMap keyed by any step, storing the effective blockHeight value (string).
// Used for inheritance: child relation fields look up their parent's blockHeight
// from this map, avoiding AsyncLocalStorage sibling-bleed issues.
const parentBlockHeightMap = new WeakMap<object, string>();

export const PgBlockHeightPlugin: GraphileConfig.Plugin = {
  name: 'PgBlockHeightPlugin',
  version: '0.0.0',
  schema: {
    hooks: {
      // Wrap field plans to inject _block_range filtering for:
      // 1. Explicit blockHeight/timestamp arg on connection/single-record fields
      // 2. Default HEIGHT_MAX when no height arg provided
      // 3. Inherited blockHeight from request context on relation fields
      GraphQLObjectType_fields_field(field: any, build: any, context: any) {
        const scope = context.scope as any;
        let codec = resolveCodecFromScope(scope);
        if (!codec) codec = resolveCodecForRootQuery(scope, build);
        if (!codec) return field;
        if (!hasBlockRange(codec)) return field;

        if (!isRelevantField(scope)) return field;

        const origPlan = field.plan;
        if (!origPlan) return field;

        field.plan = function ($parent: any, args: any, ...rest: any[]) {
          const inheritedHeight = resolveInheritedHeight($parent);
          const bhStep = args?.getRaw?.('blockHeight');
          const tsStep = args?.getRaw?.('timestamp');

          const step = origPlan.call(this, $parent, args, ...rest);
          const $select = getSelectStep(step);

          const height = resolveEffectiveHeight(args, inheritedHeight);

          applyBlockRangeFilter($select, height);

          // Store effective height for child fields to inherit (step-based, not ALS).
          parentBlockHeightMap.set(step, height);
          // Also store on the PgSelectStep for connection children.
          if ($select !== step) {
            parentBlockHeightMap.set($select, height);
          }

          // Store blockHeight step for PgAggregatesHistoricalPlugin
          const bhExplicit = bhStep && (bhStep as any).constructor?.name !== 'ConstantStep';
          const tsExplicit = tsStep && (tsStep as any).eval?.() !== null && (tsStep as any).eval?.() !== undefined;
          if (bhExplicit) {
            blockHeightStepMap.set($select, bhStep);
          } else if (tsExplicit) {
            blockHeightStepMap.set($select, tsStep);
          }

          return step;
        };
        return field;
      },

      GraphQLObjectType_fields_field_args(args: any, build: any, context: any) {
        const {extend} = build;
        const scope = context.scope as any;
        let codec = resolveCodecFromScope(scope);
        if (!codec) codec = resolveCodecForRootQuery(scope, build);
        if (!codec) return args;
        if (!hasBlockRange(codec)) return args;

        if (!isRelevantField(scope)) return args;

        const makeApplyPlan = () => {
          return function applyPlan(_parentPlan: any, $fieldPlan: any, input: any) {
            const raw = input.getRaw();
            if (!raw) return;

            const resolvedHeight = (raw as any).eval?.() ?? raw;
            if (resolvedHeight && String(resolvedHeight) !== HEIGHT_DEFAULT) {
              currentBlockHeight.enterWith(String(resolvedHeight));
            }

            // Store blockHeight step keyed by PgSelectStep for PgAggregatesHistoricalPlugin.
            const $select = getSelectStep($fieldPlan);
            blockHeightStepMap.set($select, raw);
          };
        };

        return extend(
          args,
          {
            // timestamp defined first so its applyPlan fires before blockHeight(default)
            timestamp: {
              description:
                'When specified, the query will return results as of this timestamp (Unix timestamp in milliseconds)',
              type: build.graphql.GraphQLString,
              applyPlan: makeApplyPlan(),
            },
            blockHeight: {
              description: 'When specified, the query will return results as of this block height',
              defaultValue: HEIGHT_DEFAULT,
              type: build.graphql.GraphQLString,
              applyPlan: makeApplyPlan(),
            },
          },
          'PgBlockHeightPlugin'
        );
      },
    },
  },
};
