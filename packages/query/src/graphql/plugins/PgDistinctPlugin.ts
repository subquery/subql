// Copyright 2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {PgClass, QueryBuilder} from '@subql/x-graphile-build-pg';
import {Build, Plugin} from 'graphile-build';
import type {GraphQLEnumType} from 'graphql';
import * as PgSql from 'pg-sql2';
import {SQLNode} from 'pg-sql2';

type Extend = <T1, T2>(base: T1, extra: T2, hint?: string) => T1 & T2;

const getEnumName = (entityName: string): string => {
  return `${entityName}_distinct_enum`;
};

export const PgDistinctPlugin: Plugin = (builder) => {
  // Creates enums for each entity based on their fields
  builder.hook(
    'init',
    (args, build) => {
      const {
        graphql: {GraphQLEnumType},
        newWithHooks,
        pgIntrospectionResultsByKind,
      } = build;

      pgIntrospectionResultsByKind.class.forEach((cls: PgClass) => {
        if (!cls.isSelectable || build.pgOmit(cls, 'order')) return;
        if (!cls.namespace) return;

        const enumTypeName = getEnumName(cls.name);

        const entityEnumValues: Record<string, {value: number}> = {};
        cls?.attributes?.forEach((attr, index) => {
          if (attr.name.indexOf('_') !== 0) {
            entityEnumValues[attr.name.toUpperCase()] = {value: index};
          }
        });

        newWithHooks(
          GraphQLEnumType,
          {
            name: enumTypeName,
            values: entityEnumValues,
          },
          {
            __origin: `Adding connection "distinct" enum type for ${cls.name}.`,
            pgIntrospection: cls,
          },
          true
        );
      });

      return args;
    },
    ['AddDistinctEnumsPlugin']
  );

  // Extends schema and modifies the query
  builder.hook(
    'GraphQLObjectType:fields:field:args',
    (args, build, {addArgDataGenerator, scope: {pgFieldIntrospection}}) => {
      const {
        extend,
        graphql: {GraphQLList},
        pgSql: sql,
      } = build as Build & {extend: Extend; pgSql: typeof PgSql};

      const enumTypeName = getEnumName(pgFieldIntrospection?.name);
      const enumType = build.getTypeByName(enumTypeName) as GraphQLEnumType;

      if (!enumType) {
        return args;
      }

      addArgDataGenerator(({distinct}) => ({
        pgQuery: (queryBuilder: QueryBuilder) => {
          distinct?.map((field: number) => {
            const {name} = enumType.getValues()[field];
            const fieldName = name.toLowerCase();
            if (!pgFieldIntrospection?.attributes?.map((a) => a.name).includes(fieldName)) {
              console.warn(`Distinct field ${fieldName} doesn't exist on entity ${pgFieldIntrospection?.name}`);

              return;
            }
            //export declare type SQL = SQLNode | SQLQuery;
            const id = sql.fragment`${queryBuilder.getTableAlias() as unknown as SQLNode}.${sql.identifier(fieldName)}`;

            // Dependent on https://github.com/graphile/graphile-engine/pull/805
            (queryBuilder as any).distinctOn(id);
          });
        },
      }));

      return extend(
        args,
        {
          distinct: {
            description: 'Fields to be distinct',
            defaultValue: null,
            type: new GraphQLList(enumType),
          },
        },
        'DistinctPlugin'
      );
    }
  );
};
