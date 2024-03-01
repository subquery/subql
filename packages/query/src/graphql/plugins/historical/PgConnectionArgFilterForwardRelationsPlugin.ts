/* eslint-disable */

/* INFO: This file has been modified from https://github.com/graphile-contrib/postgraphile-plugin-connection-filter to support historical queries */

import type {Plugin} from 'graphile-build';
import type {PgAttribute, PgClass, PgConstraint} from 'graphile-build-pg';
import {ConnectionFilterResolver} from 'postgraphile-plugin-connection-filter/dist/PgConnectionArgFilterPlugin';
import {makeRangeQuery, hasBlockRange} from './utils';

const PgConnectionArgFilterForwardRelationsPlugin: Plugin = (builder) => {
  builder.hook('inflection', (inflection) => ({
    ...inflection,
    filterForwardRelationExistsFieldName(relationFieldName: string) {
      return `${relationFieldName}Exists`;
    },
    filterSingleRelationFieldName(fieldName: string) {
      return fieldName;
    },
  }));

  builder.hook('GraphQLInputObjectType:fields', (fields, build, context) => {
    const {
      describePgEntity,
      extend,
      newWithHooks,
      inflection,
      graphql: {GraphQLBoolean},
      pgOmit: omit,
      pgSql: sql,
      pgIntrospectionResultsByKind: introspectionResultsByKind,
      connectionFilterResolve,
      connectionFilterRegisterResolver,
      connectionFilterTypesByTypeName,
      connectionFilterType,
    } = build;
    const {
      fieldWithHooks,
      scope: {pgIntrospection: table, isPgConnectionFilter},
      Self,
    } = context;

    if (!isPgConnectionFilter || table.kind !== 'class') return fields;

    connectionFilterTypesByTypeName[Self.name] = Self;

    const forwardRelationSpecs = (introspectionResultsByKind.constraint as PgConstraint[])
      .filter((con) => con.type === 'f')
      .filter((con) => con.classId === table.id)
      .reduce((memo: ForwardRelationSpec[], constraint) => {
        if (omit(constraint, 'read') || omit(constraint, 'filter')) {
          return memo;
        }
        const foreignTable = constraint.foreignClassId
          ? introspectionResultsByKind.classById[constraint.foreignClassId]
          : null;
        if (!foreignTable) {
          throw new Error(`Could not find the foreign table (constraint: ${constraint.name})`);
        }
        if (omit(foreignTable, 'read') || omit(foreignTable, 'filter')) {
          return memo;
        }
        const attributes = (introspectionResultsByKind.attribute as PgAttribute[])
          .filter((attr) => attr.classId === table.id)
          .sort((a, b) => a.num - b.num);
        const foreignAttributes = (introspectionResultsByKind.attribute as PgAttribute[])
          .filter((attr) => attr.classId === foreignTable.id)
          .sort((a, b) => a.num - b.num);
        const keyAttributes = constraint.keyAttributeNums.map(
          (num) => attributes.filter((attr) => attr.num === num)[0]
        );
        const foreignKeyAttributes = constraint.foreignKeyAttributeNums.map(
          (num) => foreignAttributes.filter((attr) => attr.num === num)[0]
        );
        if (keyAttributes.some((attr) => omit(attr, 'read'))) {
          return memo;
        }
        if (foreignKeyAttributes.some((attr) => omit(attr, 'read'))) {
          return memo;
        }
        memo.push({
          table,
          keyAttributes,
          foreignTable,
          foreignKeyAttributes,
          constraint,
        });
        return memo;
      }, []);

    let forwardRelationSpecByFieldName: {
      [fieldName: string]: ForwardRelationSpec;
    } = {};

    const addField = (
      fieldName: string,
      description: string,
      type: any,
      resolve: any,
      spec: ForwardRelationSpec,
      hint: string
    ) => {
      // Field
      fields = extend(
        fields,
        {
          [fieldName]: fieldWithHooks(
            fieldName,
            {
              description,
              type,
            },
            {
              isPgConnectionFilterField: true,
            }
          ),
        },
        hint
      );
      // Spec for use in resolver
      forwardRelationSpecByFieldName = extend(forwardRelationSpecByFieldName, {
        [fieldName]: spec,
      });
      // Resolver
      connectionFilterRegisterResolver(Self.name, fieldName, resolve);
    };

    const resolve: ConnectionFilterResolver = ({sourceAlias, fieldName, fieldValue, queryBuilder}) => {
      if (fieldValue == null) return null;

      const {foreignTable, foreignKeyAttributes, keyAttributes} = forwardRelationSpecByFieldName[fieldName];

      const foreignTableAlias = sql.identifier(Symbol());

      const sqlIdentifier = sql.identifier(foreignTable.namespace.name, foreignTable.name);

      /******************************
       * HISTORICAL CHANGES BEGIN
       *******************************/

      const keyMatches = keyAttributes.map((key, i) => {
        return sql.fragment`${sourceAlias}.${sql.identifier(key.name)} = ${foreignTableAlias}.${sql.identifier(
          foreignKeyAttributes[i].name
        )}`;
      });

      if (queryBuilder.context.args?.blockHeight && hasBlockRange(table)) {
        keyMatches.push(makeRangeQuery(foreignTableAlias, queryBuilder.context.args.blockHeight, sql));
      }

      const sqlKeysMatch = sql.query`(${sql.join(keyMatches, ') and (')})`;

      /******************************
       * HISTORICAL CHANGES END
       *******************************/

      const foreignTableTypeName = inflection.tableType(foreignTable);
      const foreignTableFilterTypeName = inflection.filterType(foreignTableTypeName);

      const sqlFragment = connectionFilterResolve(
        fieldValue,
        foreignTableAlias,
        foreignTableFilterTypeName,
        queryBuilder
      );

      return sqlFragment == null
        ? null
        : sql.query`\
      exists(
        select 1 from ${sqlIdentifier} as ${foreignTableAlias}
        where ${sqlKeysMatch} and
          (${sqlFragment})
      )`;
    };

    const resolveExists: ConnectionFilterResolver = ({sourceAlias, fieldName, fieldValue, queryBuilder}) => {
      if (fieldValue == null) return null;

      const {foreignTable, foreignKeyAttributes, keyAttributes} = forwardRelationSpecByFieldName[fieldName];

      const foreignTableAlias = sql.identifier(Symbol());

      const sqlIdentifier = sql.identifier(foreignTable.namespace.name, foreignTable.name);

      /******************************
       * HISTORICAL CHANGES BEGIN
       *******************************/

      const keyMatches = keyAttributes.map((key, i) => {
        return sql.fragment`${sourceAlias}.${sql.identifier(key.name)} = ${foreignTableAlias}.${sql.identifier(
          foreignKeyAttributes[i].name
        )}`;
      });

      if (queryBuilder.context.args?.blockHeight && hasBlockRange(table)) {
        keyMatches.push(makeRangeQuery(foreignTableAlias, queryBuilder.context.args.blockHeight, sql));
      }

      const sqlKeysMatch = sql.query`(${sql.join(keyMatches, ') and (')})`;

      /******************************
       * HISTORICAL CHANGES END
       *******************************/

      const sqlSelectWhereKeysMatch = sql.query`select 1 from ${sqlIdentifier} as ${foreignTableAlias} where ${sqlKeysMatch}`;

      return fieldValue === true
        ? sql.query`exists(${sqlSelectWhereKeysMatch})`
        : sql.query`not exists(${sqlSelectWhereKeysMatch})`;
    };

    for (const spec of forwardRelationSpecs) {
      const {constraint, foreignTable, keyAttributes} = spec;
      const fieldName = inflection.singleRelationByKeys(keyAttributes, foreignTable, table, constraint);
      const filterFieldName = inflection.filterSingleRelationFieldName(fieldName);
      const foreignTableTypeName = inflection.tableType(foreignTable);
      const foreignTableFilterTypeName = inflection.filterType(foreignTableTypeName);
      const ForeignTableFilterType = connectionFilterType(
        newWithHooks,
        foreignTableFilterTypeName,
        foreignTable,
        foreignTableTypeName
      );
      if (!ForeignTableFilterType) continue;

      addField(
        filterFieldName,
        `Filter by the object’s \`${fieldName}\` relation.`,
        ForeignTableFilterType,
        resolve,
        spec,
        `Adding connection filter forward relation field from ${describePgEntity(table)} to ${describePgEntity(
          foreignTable
        )}`
      );

      const keyIsNullable = !keyAttributes.every((attr) => attr.isNotNull);
      if (keyIsNullable) {
        const existsFieldName = inflection.filterForwardRelationExistsFieldName(fieldName);
        addField(
          existsFieldName,
          `A related \`${fieldName}\` exists.`,
          GraphQLBoolean,
          resolveExists,
          spec,
          `Adding connection filter forward relation exists field from ${describePgEntity(table)} to ${describePgEntity(
            foreignTable
          )}`
        );
      }
    }

    return fields;
  });
};

export interface ForwardRelationSpec {
  table: PgClass;
  keyAttributes: PgAttribute[];
  foreignTable: PgClass;
  foreignKeyAttributes: PgAttribute[];
  constraint: PgConstraint;
}

export default PgConnectionArgFilterForwardRelationsPlugin;
