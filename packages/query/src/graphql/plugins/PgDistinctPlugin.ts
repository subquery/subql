// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import sql from 'pg-sql2';
import {getYargsOption} from '../../yargs';

let patched = false;

const getEnumName = (entityName: string): string => {
  const pascal = entityName.charAt(0).toUpperCase() + entityName.slice(1);
  return `${pascal}DistinctEnum`;
};

export const PgDistinctPlugin: GraphileConfig.Plugin = {
  name: 'PgDistinctPlugin',
  version: '0.0.0',
  schema: {
    hooks: {
      init(_data, build) {
        const pgRegistry = (build as any).input?.pgRegistry;
        if (!pgRegistry?.pgResources) return _data;

        const seen = new Set<string>();
        for (const resource of Object.values(pgRegistry.pgResources) as any[]) {
          const codec = resource.codec;
          if (!codec?.attributes || seen.has(codec.name)) continue;
          seen.add(codec.name);
          const enumTypeName = getEnumName(codec.name);
          const values: Record<string, {value: string}> = {};
          for (const [attrName] of Object.entries(codec.attributes) as any) {
            if (!attrName.startsWith('_')) {
              values[attrName.toUpperCase()] = {value: attrName};
            }
          }
          build.registerEnumType(
            enumTypeName,
            {pgCodec: codec},
            () => ({values}),
            `PgDistinctPlugin enum for ${codec.name}`
          );
        }

        // Monkey-patch PgSelectStep.optimize to add DISTINCT ON after selects populated
        if (!patched) {
          patched = true;
          try {
            const {PgSelectStep} = require('@dataplan/pg');
            const origOptimize = PgSelectStep.prototype.optimize;
            PgSelectStep.prototype.optimize = function (options: any) {
              const result = origOptimize.call(this, options);
              if (result !== this) return result;
              const distinctOn = (this as any)._meta?.distinctOn;
              if (distinctOn?.length > 0 && this.selects?.length > 0) {
                this.selects[0] = sql`distinct on (${sql.join(
                  distinctOn.map((v: string) => sql.identifier(v)),
                  ', '
                )}) ${this.selects[0]}`;
              }
              return result;
            };
          } catch (e: any) {
            console.warn(
              `PgDistinctPlugin: failed to patch PgSelectStep.optimize — DISTINCT ON disabled. ${e.message}`
            );
          }
        }
        return _data;
      },
      GraphQLObjectType_fields_field_args(args, build, context) {
        const {
          extend,
          getTypeByName,
          graphql: {GraphQLList},
        } = build;
        const {scope: {isPgFieldConnection, isPgFieldSimpleCollection, pgFieldCodec, pgFieldResource} = {}} = context;
        if (!isPgFieldConnection && !isPgFieldSimpleCollection) return args;
        const codec = (pgFieldCodec as any) ?? (pgFieldResource as any)?.codec;
        if (!codec?.attributes) return args;
        const enumType = getTypeByName(getEnumName(codec.name));
        if (!enumType) return args;

        return extend(
          args,
          {
            distinct: {
              description: 'Fields to be distinct',
              defaultValue: null,
              type: new GraphQLList(enumType),
            },
          },
          'PgDistinctPlugin'
        );
      },
      GraphQLObjectType_fields_field(field: any, _build: any, context: any) {
        const {scope: {isPgFieldConnection, isPgFieldSimpleCollection} = {}} = context;
        if (!isPgFieldConnection && !isPgFieldSimpleCollection) return field;
        const origPlan = field.plan;
        if (!origPlan) return field;

        field.plan = function ($parent: any, args: any, ...rest: any[]) {
          const $connection = origPlan.call(this, $parent, args, ...rest);
          const $select = $connection?.getSubplan?.();
          if (!$select) return $connection;

          const rawStep = args?.getRaw?.('distinct');
          if (!rawStep?.eval) return $connection;
          try {
            const distinctValues = rawStep.eval();
            if (!Array.isArray(distinctValues) || distinctValues.length === 0) return $connection;
            ($select as any)._meta.distinctOn = distinctValues;
            if (getYargsOption().argv['dictionary-optimisation']) {
              ($select as any).setOrderIsUnique();
            }
          } catch {
            // ignore
          }
          return $connection;
        };
        return field;
      },
    },
  },
};
