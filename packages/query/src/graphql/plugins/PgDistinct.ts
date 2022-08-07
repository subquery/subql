// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// import {Context, Plugin} from 'graphile-build';
// import type { GraphQLInputFieldConfigMap } from 'graphql';
// import type {PgClass, PgProc} from 'graphile-build-pg';

// import {GraphQLInputFieldConfigMap} from "graphql";
// import {PgClass, PgProc} from "graphile-build-pg";
// import {QueryBuilder} from "graphile-build-pg";

// export const PgDistinct: Plugin = (builder, {connectionFilterSetofFunctions}) => {
//   builder.hook(
//     "GraphQLInputObjectType:fields",
//     (fields, build, context) => {
//
//         const {describePgEntity, extend, newWithHooks, pgSql: sql,  } = build;
//         const {
//             addArgDataGenerator,
//             scope: {
//                 pgFieldIntrospection
//             }
//         } = context;
//         // need to
//         // const {text} = sql.compile();
//         // const fmtArg = text.slice(1).replace(/['"]+/g, '');
//         // addArgDataGenerator(() => ({
//         //     pgQuery: (queryBuilder: QueryBuilder) => {
//         //         queryBuilder.where(
//         //             sql.fragment`${queryBuilder.getTableAlias()}._block_range @> ${queryBuilder.context.args.blockHeight}`
//         //         )
//         //     }
//         // }))
//       return fields;
//     }
//   );
//   builder.hook('GraphQLObjectType:fields:field:args', (args, build, context) => {
//       const {
//           connectionFilterResolve,
//           connectionFilterType,
//           extend,
//           getTypeByName,
//           inflection,
//           newWithHooks,
//           pgGetGqlTypeByTypeIdAndModifier,
//           pgOmit: omit,
//       } = build;
//
//       const {
//           Self,
//           addArgDataGenerator,
//           field,
//           scope: {
//               isPgFieldConnection,
//               isPgFieldSimpleCollection,
//               pgFieldIntrospection: source,
//           },
//       } = context as Context<GraphQLInputFieldConfigMap> & {
//           scope: {
//               pgFieldIntrospection: PgClass | PgProc;
//               isPgConnectionFilter?: boolean;
//           };
//       };
//
//       const distinct = isPgFieldConnection || isPgFieldSimpleCollection
//       if (!distinct)  return args
//
//       if (!source) return args;
//       if (omit(source, "distinct")) return args;
//
//       if (source.kind === "procedure") {
//           if (!(source.tags.filterable || connectionFilterSetofFunctions)) {
//               return args;
//           }
//       }
//
//       return args;
//   });
// };

import type {Context, Plugin} from 'graphile-build';
import type {PgClass, PgProc, PgType, QueryBuilder, SQL} from 'graphile-build-pg';
import type {GraphQLInputFieldConfigMap, GraphQLInputType, GraphQLType} from 'graphql';
import {BackwardRelationSpec} from 'postgraphile-plugin-connection-filter/dist/PgConnectionArgFilterBackwardRelationsPlugin';

export const PgDistinct: Plugin = (
  builder,
  {
    connectionFilterAllowEmptyObjectInput,
    connectionFilterAllowNullInput,
    connectionFilterAllowedFieldTypes,
    connectionFilterArrays,
    connectionFilterSetofFunctions,
  }
) => {
  // Add `filter` input argument to connection and simple collection types
  builder.hook('GraphQLObjectType:fields:field:args', (args, build, context) => {
    const {
      connectionFilterResolve,
      connectionFilterType,
      extend,
      getTypeByName,
      inflection,
      newWithHooks,
      pgGetGqlTypeByTypeIdAndModifier,
      pgOmit: omit,
    } = build;
    const {
      Self,
      addArgDataGenerator,
      field,
      scope: {isPgFieldConnection, isPgFieldSimpleCollection, pgFieldIntrospection: source},
    } = context as Context<GraphQLInputFieldConfigMap> & {
      scope: {
        pgFieldIntrospection: PgClass | PgProc;
        isPgConnectionFilter?: boolean;
      };
    };

    const shouldAddFilter = isPgFieldConnection || isPgFieldSimpleCollection;
    if (!shouldAddFilter) return args;

    if (!source) return args;
    if (omit(source, 'distinct')) return args;

    if (source.kind === 'procedure') {
      if (!(source.tags.filterable || connectionFilterSetofFunctions)) {
        return args;
      }
    }

    const returnTypeId = source.kind === 'class' ? source.type.id : source.returnTypeId;
    const returnType =
      source.kind === 'class'
        ? source.type
        : (build.pgIntrospectionResultsByKind.type as PgType[]).find((t) => t.id === returnTypeId);
    if (!returnType) {
      return args;
    }
    const isRecordLike = returnTypeId === '2249';
    const nodeTypeName = isRecordLike
      ? inflection.recordFunctionReturnType(source)
      : pgGetGqlTypeByTypeIdAndModifier(returnTypeId, null).name;
    const filterTypeName = inflection.filterType(nodeTypeName);
    const nodeType = getTypeByName(nodeTypeName);
    if (!nodeType) {
      return args;
    }
    const nodeSource = source.kind === 'procedure' && returnType.class ? returnType.class : source;

    const FilterType = connectionFilterType(newWithHooks, filterTypeName, nodeSource, nodeTypeName);
    if (!FilterType) {
      return args;
    }

    // Generate SQL where clause from filter argument
    addArgDataGenerator(function connectionFilter(args: any) {
      return {
        pgQuery: (queryBuilder: QueryBuilder) => {
          if (Object.prototype.hasOwnProperty.call(args, 'filter')) {
            const sqlFragment = connectionFilterResolve(
              args.filter,
              queryBuilder.getTableAlias(),
              filterTypeName,
              queryBuilder,
              returnType,
              null
            );
            // eslint-disable-next-line eqeqeq
            if (sqlFragment != null) {
              queryBuilder.where(sqlFragment);
            }
          }
        },
      };
    });

    return extend(
      args,
      {
        filter: {
          description: 'A distinct to be used in determining which values should be returned by the collection.',
          type: FilterType,
        },
      },
      `Adding connection distinct arg to field '${field.name}' of '${Self.name}'`
    );
  });

  builder.hook('build', (build) => {
    const {
      extend,
      graphql: {GraphQLInputObjectType, GraphQLList, getNamedType},
      inflection,
      pgGetGqlInputTypeByTypeIdAndModifier,
      pgGetGqlTypeByTypeIdAndModifier,
      pgIntrospectionResultsByKind: introspectionResultsByKind,
      pgSql: sql,
    } = build;

    const connectionFilterResolvers: {[typeName: string]: any} = {};
    const connectionFilterTypesByTypeName: {
      [typeName: string]: any;
    } = {};

    const handleNullInput = () => {
      if (!connectionFilterAllowNullInput) {
        throw new Error('Null literals are forbidden in filter argument input.');
      }
      return null;
    };

    const handleEmptyObjectInput = () => {
      if (!connectionFilterAllowEmptyObjectInput) {
        throw new Error('Empty objects are forbidden in filter argument input.');
      }
      return null;
    };

    const isEmptyObject = (obj: any) =>
      typeof obj === 'object' && obj !== null && !Array.isArray(obj) && Object.keys(obj).length === 0;

    const connectionFilterRegisterResolver = (typeName: string, fieldName: string, resolve: any) => {
      connectionFilterResolvers[typeName] = extend(connectionFilterResolvers[typeName] || {}, {[fieldName]: resolve});
    };

    const connectionFilterResolve = (
      obj: any,
      sourceAlias: SQL,
      typeName: string,
      queryBuilder: QueryBuilder,
      pgType: PgType,
      pgTypeModifier: number,
      parentFieldName: string,
      parentFieldInfo: {backwardRelationSpec: BackwardRelationSpec}
    ) => {
      if (obj === null) return handleNullInput();
      if (isEmptyObject(obj)) return handleEmptyObjectInput();

      const sqlFragments = Object.entries(obj)
        .map(([key, value]) => {
          if (value === null) return handleNullInput();
          if (isEmptyObject(value)) return handleEmptyObjectInput();

          const resolversByFieldName = connectionFilterResolvers[typeName];
          if (resolversByFieldName && resolversByFieldName[key]) {
            return resolversByFieldName[key]({
              sourceAlias,
              fieldName: key,
              fieldValue: value,
              queryBuilder,
              pgType,
              pgTypeModifier,
              parentFieldName,
              parentFieldInfo,
            });
          }
          throw new Error(`Unable to resolve filter field '${key}'`);
        })
        // eslint-disable-next-line eqeqeq
        .filter((x) => x != null);

      return sqlFragments.length === 0 ? null : sql.query`(${sql.join(sqlFragments, ') and (')})`;
    };

    // Get or create types like IntFilter, StringFilter, etc.
    // eslint-disable-next-line complexity
    const connectionFilterOperatorsType = (newWithHooks: any, pgTypeId: number, pgTypeModifier: number) => {
      const pgType = introspectionResultsByKind.typeById[pgTypeId];

      const allowedPgTypeTypes = ['b', 'd', 'e', 'r'];
      if (!allowedPgTypeTypes.includes(pgType.type)) {
        // Not a base, domain, enum, or range type? Skip.
        return null;
      }

      // Perform some checks on the simple type (after removing array/range/domain wrappers)
      const pgGetNonArrayType = (pgType: PgType) =>
        pgType.isPgArray && pgType.arrayItemType ? pgType.arrayItemType : pgType;
      const pgGetNonRangeType = (pgType: PgType) =>
        (pgType as any).rangeSubTypeId ? introspectionResultsByKind.typeById[(pgType as any).rangeSubTypeId] : pgType;
      const pgGetNonDomainType = (pgType: PgType) =>
        pgType.type === 'd' && pgType.domainBaseTypeId
          ? introspectionResultsByKind.typeById[pgType.domainBaseTypeId]
          : pgType;
      const pgGetSimpleType = (pgType: PgType) => pgGetNonDomainType(pgGetNonRangeType(pgGetNonArrayType(pgType)));
      const pgSimpleType = pgGetSimpleType(pgType);
      if (!pgSimpleType) return null;
      if (!(pgSimpleType.type === 'e' || (pgSimpleType.type === 'b' && !pgSimpleType.isPgArray))) {
        // Haven't found an enum type or a non-array base type? Skip.
        return null;
      }
      if (pgSimpleType.name === 'json') {
        // The PG `json` type has no valid operators.
        // Skip filter type creation to allow the proper
        // operators to be exposed for PG `jsonb` types.
        return null;
      }

      // Establish field type and field input type
      const fieldType: GraphQLType | undefined = pgGetGqlTypeByTypeIdAndModifier(pgTypeId, pgTypeModifier);
      if (!fieldType) return null;
      const fieldInputType: GraphQLType | undefined = pgGetGqlInputTypeByTypeIdAndModifier(pgTypeId, pgTypeModifier);
      if (!fieldInputType) return null;

      // Avoid exposing filter operators on unrecognized types that PostGraphile handles as Strings
      const namedType = getNamedType(fieldType);
      const namedInputType = getNamedType(fieldInputType);
      const actualStringPgTypeIds = [
        '1042', // bpchar
        '18', //   char
        '19', //   name
        '25', //   text
        '1043', // varchar
      ];
      // Include citext as recognized String type
      const citextPgType = (introspectionResultsByKind.type as PgType[]).find((t) => t.name === 'citext');
      if (citextPgType) {
        actualStringPgTypeIds.push(citextPgType.id);
      }
      if (namedInputType && namedInputType.name === 'String' && !actualStringPgTypeIds.includes(pgSimpleType.id)) {
        // Not a real string type? Skip.
        return null;
      }

      // Respect `connectionFilterAllowedFieldTypes` config option
      if (connectionFilterAllowedFieldTypes && !connectionFilterAllowedFieldTypes.includes(namedType.name)) {
        return null;
      }

      const pgConnectionFilterOperatorsCategory = pgType.isPgArray
        ? 'Array'
        : pgType.rangeSubTypeId
        ? 'Range'
        : pgType.type === 'e'
        ? 'Enum'
        : pgType.type === 'd'
        ? 'Domain'
        : 'Scalar';

      // Respect `connectionFilterArrays` config option
      if (pgConnectionFilterOperatorsCategory === 'Array' && !connectionFilterArrays) {
        return null;
      }

      const rangeElementInputType = pgType.rangeSubTypeId
        ? pgGetGqlInputTypeByTypeIdAndModifier(pgType.rangeSubTypeId, pgTypeModifier)
        : null;

      const domainBaseType =
        pgType.type === 'd'
          ? pgGetGqlTypeByTypeIdAndModifier(pgType.domainBaseTypeId, pgType.domainTypeModifier)
          : null;

      const isListType = fieldType instanceof GraphQLList;
      const operatorsTypeName = isListType
        ? inflection.filterFieldListType(namedType.name)
        : inflection.filterFieldType(namedType.name);

      const existingType = connectionFilterTypesByTypeName[operatorsTypeName];
      if (existingType) {
        if (typeof existingType._fields === 'object' && Object.keys(existingType._fields).length === 0) {
          // Existing type is fully defined and
          // there are no fields, so don't return a type
          return null;
        }
        // Existing type isn't fully defined or is
        // fully defined with fields, so return it
        return existingType;
      }
      return newWithHooks(
        GraphQLInputObjectType,
        {
          name: operatorsTypeName,
          description: `A filter to be used against ${namedType.name}${
            isListType ? ' List' : ''
          } fields. All fields are combined with a logical ‘and.’`,
        },
        {
          isPgConnectionFilterOperators: true,
          pgConnectionFilterOperatorsCategory,
          fieldType,
          fieldInputType,
          rangeElementInputType,
          domainBaseType,
        },
        true
      );
    };

    const connectionFilterType = (
      newWithHooks: any,
      filterTypeName: string,
      source: PgClass | PgProc,
      nodeTypeName: string
    ) => {
      const existingType = connectionFilterTypesByTypeName[filterTypeName];
      if (existingType) {
        if (typeof existingType._fields === 'object' && Object.keys(existingType._fields).length === 0) {
          // Existing type is fully defined and
          // there are no fields, so don't return a type
          return null;
        }
        // Existing type isn't fully defined or is
        // fully defined with fields, so return it
        return existingType;
      }
      return newWithHooks(
        GraphQLInputObjectType,
        {
          description: `A filter to be used against \`${nodeTypeName}\` object types. All fields are combined with a logical ‘and.’`,
          name: filterTypeName,
        },
        {
          pgIntrospection: source,
          isPgConnectionFilter: true,
        },
        true
      );
    };

    const escapeLikeWildcards = (input: string) => {
      if ('string' !== typeof input) {
        throw new Error('Non-string input was provided to escapeLikeWildcards');
      } else {
        return input.split('%').join('\\%').split('_').join('\\_');
      }
    };

    const addConnectionFilterOperator: AddConnectionFilterOperator = (
      typeNames,
      operatorName,
      description,
      resolveType,
      resolve,
      options = {}
    ) => {
      if (!typeNames) {
        const msg = `Missing first argument 'typeNames' in call to 'addConnectionFilterOperator' for operator '${operatorName}'`;
        throw new Error(msg);
      }
      if (!operatorName) {
        const msg = `Missing second argument 'operatorName' in call to 'addConnectionFilterOperator' for operator '${operatorName}'`;
        throw new Error(msg);
      }
      if (!resolveType) {
        const msg = `Missing fourth argument 'resolveType' in call to 'addConnectionFilterOperator' for operator '${operatorName}'`;
        throw new Error(msg);
      }
      if (!resolve) {
        const msg = `Missing fifth argument 'resolve' in call to 'addConnectionFilterOperator' for operator '${operatorName}'`;
        throw new Error(msg);
      }

      const {connectionFilterScalarOperators} = build;

      const gqlTypeNames = Array.isArray(typeNames) ? typeNames : [typeNames];
      for (const gqlTypeName of gqlTypeNames) {
        if (!connectionFilterScalarOperators[gqlTypeName]) {
          connectionFilterScalarOperators[gqlTypeName] = {};
        }
        if (connectionFilterScalarOperators[gqlTypeName][operatorName]) {
          const msg = `Operator '${operatorName}' already exists for type '${gqlTypeName}'.`;
          throw new Error(msg);
        }
        connectionFilterScalarOperators[gqlTypeName][operatorName] = {
          description,
          resolveType,
          resolve,
          // These functions may exist on `options`: resolveSqlIdentifier, resolveSqlValue, resolveInput
          ...options,
        };
      }
    };

    return extend(build, {
      connectionFilterTypesByTypeName,
      connectionFilterRegisterResolver,
      connectionFilterResolve,
      connectionFilterOperatorsType,
      connectionFilterType,
      escapeLikeWildcards,
      addConnectionFilterOperator,
    });
  });
};

export interface ConnectionFilterResolver {
  (input: {
    sourceAlias: SQL;
    fieldName: string;
    fieldValue?: unknown;
    queryBuilder: QueryBuilder;
    pgType: PgType;
    pgTypeModifier: number | null;
    parentFieldName: string;
    parentFieldInfo?: {backwardRelationSpec?: BackwardRelationSpec};
  }): SQL | null;
}

export interface AddConnectionFilterOperator {
  (
    typeNames: string | string[],
    operatorName: string,
    description: string | null,
    resolveType: (fieldInputType: GraphQLInputType, rangeElementInputType: GraphQLInputType) => GraphQLType,
    resolve: (
      sqlIdentifier: SQL,
      sqlValue: SQL,
      input: unknown,
      parentFieldName: string,
      queryBuilder: QueryBuilder
    ) => SQL | null,
    options?: {
      resolveInput?: (input: unknown) => unknown;
      resolveSqlIdentifier?: (sqlIdentifier: SQL, pgType: PgType, pgTypeModifier: number | null) => SQL;
      resolveSqlValue?: (
        input: unknown,
        pgType: PgType,
        pgTypeModifier: number | null,
        resolveListItemSqlValue?: any
      ) => SQL | null;
    }
  ): void;
}

// export default PgConnectionArgFilterPlugin;
