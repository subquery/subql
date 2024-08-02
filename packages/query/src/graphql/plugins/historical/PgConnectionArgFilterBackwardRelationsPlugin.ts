/* eslint-disable */

/* INFO: This file has been modified from https://github.com/graphile-contrib/postgraphile-plugin-connection-filter to support historical queries */
import {SQL} from '@subql/x-graphile-build-pg';
import type {PgEntity, PgAttribute, PgClass, PgConstraint, QueryBuilder} from '@subql/x-graphile-build-pg';
import type {Plugin} from 'graphile-build';
import {ConnectionFilterResolver} from 'postgraphile-plugin-connection-filter/dist/PgConnectionArgFilterPlugin';
import {makeRangeQuery, hasBlockRange} from './utils';

/* This is a modification from the original function where a block range condition is added */
export function buildWhereConditionBackward(
  table: PgEntity,
  foreignTableAlias: SQL,
  sourceAlias: SQL,
  foreignKeyAttributes: PgAttribute[],
  keyAttributes: PgAttribute[],
  queryBuilder: QueryBuilder,
  sql: any
): SQL {
  const fkMatches = foreignKeyAttributes.map((attr, i) => {
    return sql.fragment`${foreignTableAlias}.${sql.identifier(attr.name)} = ${sourceAlias}.${sql.identifier(
      keyAttributes[i].name
    )}`;
  });

  if (queryBuilder.context.args?.blockHeight && hasBlockRange(table)) {
    fkMatches.push(makeRangeQuery(foreignTableAlias, queryBuilder.context.args.blockHeight, sql));
  }

  return sql.query`(${sql.join(fkMatches, ') and (')})`;
}

export function connectionFilterResolveBlockHeight(
  fieldValue: unknown,
  foreignTableAlias: SQL,
  foreignTableFilterTypeName: string,
  queryBuilder: QueryBuilder,
  connectionFilterResolve: (
    fieldValue: unknown,
    foreignTableAlias: SQL,
    foreignTableFilterTypeName: string,
    queryBuilder: QueryBuilder
    // There are more args but they don't seem to be used
  ) => SQL | null,
  foreignTable: PgEntity,
  sql: any
): SQL | null {
  const sqlFragment = connectionFilterResolve(fieldValue, foreignTableAlias, foreignTableFilterTypeName, queryBuilder);

  if (sqlFragment === null) {
    return null;
  }

  if (queryBuilder.context.args?.blockHeight === undefined || !hasBlockRange(foreignTable)) {
    return sqlFragment;
  }

  return sql.join(
    [sqlFragment, makeRangeQuery(foreignTableAlias, queryBuilder.context.args.blockHeight, sql)],
    ') and ('
  );
}

const PgConnectionArgFilterBackwardRelationsPlugin: Plugin = (
  builder,
  {pgSimpleCollections, pgOmitListSuffix, connectionFilterUseListInflectors}
) => {
  const hasConnections = pgSimpleCollections !== 'only';
  const simpleInflectorsAreShorter = pgOmitListSuffix === true;
  if (simpleInflectorsAreShorter && connectionFilterUseListInflectors === undefined) {
    // TODO: in V3 consider doing this for the user automatically (doing it in V2 would be a breaking change)
    console.warn(
      `We recommend you set the 'connectionFilterUseListInflectors' option to 'true' since you've set the 'pgOmitListSuffix' option`
    );
  }
  const useConnectionInflectors =
    connectionFilterUseListInflectors === undefined ? hasConnections : !connectionFilterUseListInflectors;

  builder.hook('inflection', (inflection) => {
    return Object.assign(inflection, {
      filterManyType(table: PgClass, foreignTable: PgClass): string {
        return (this as any).upperCamelCase(
          `${(this as any).tableType(table)}-to-many-${(this as any).tableType(foreignTable)}-filter`
        );
      },
      filterBackwardSingleRelationExistsFieldName(relationFieldName: string) {
        return `${relationFieldName}Exists`;
      },
      filterBackwardManyRelationExistsFieldName(relationFieldName: string) {
        return `${relationFieldName}Exist`;
      },
      filterSingleRelationByKeysBackwardsFieldName(fieldName: string) {
        return fieldName;
      },
      filterManyRelationByKeysFieldName(fieldName: string) {
        return fieldName;
      },
    });
  });

  builder.hook('GraphQLInputObjectType:fields', (fields, build, context) => {
    const {
      describePgEntity,
      extend,
      newWithHooks,
      inflection,
      pgOmit: omit,
      pgSql: sql,
      pgIntrospectionResultsByKind: introspectionResultsByKind,
      graphql: {GraphQLInputObjectType, GraphQLBoolean},
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

    const backwardRelationSpecs = (introspectionResultsByKind.constraint as PgConstraint[])
      .filter((con) => con.type === 'f')
      .filter((con) => con.foreignClassId === table.id)
      .reduce((memo: BackwardRelationSpec[], foreignConstraint) => {
        if (omit(foreignConstraint, 'read') || omit(foreignConstraint, 'filter')) {
          return memo;
        }
        const foreignTable = introspectionResultsByKind.classById[foreignConstraint.classId];
        if (!foreignTable) {
          throw new Error(`Could not find the foreign table (constraint: ${foreignConstraint.name})`);
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
        const keyAttributes = foreignConstraint.foreignKeyAttributeNums.map(
          (num) => attributes.filter((attr) => attr.num === num)[0]
        );
        const foreignKeyAttributes = foreignConstraint.keyAttributeNums.map(
          (num) => foreignAttributes.filter((attr) => attr.num === num)[0]
        );
        if (keyAttributes.some((attr) => omit(attr, 'read'))) {
          return memo;
        }
        if (foreignKeyAttributes.some((attr) => omit(attr, 'read'))) {
          return memo;
        }
        const isForeignKeyUnique = !!(introspectionResultsByKind.constraint as PgConstraint[]).find(
          (c) =>
            c.classId === foreignTable.id &&
            (c.type === 'p' || c.type === 'u') &&
            c.keyAttributeNums.length === foreignKeyAttributes.length &&
            c.keyAttributeNums.every((n, i) => foreignKeyAttributes[i].num === n)
        );
        memo.push({
          table,
          keyAttributes,
          foreignTable,
          foreignKeyAttributes,
          foreignConstraint,
          isOneToMany: !isForeignKeyUnique,
        });
        return memo;
      }, []);

    let backwardRelationSpecByFieldName: {
      [fieldName: string]: BackwardRelationSpec;
    } = {};

    const addField = (
      fieldName: string,
      description: string,
      type: any,
      resolve: any,
      spec: BackwardRelationSpec,
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
      // Relation spec for use in resolver
      backwardRelationSpecByFieldName = extend(backwardRelationSpecByFieldName, {
        [fieldName]: spec,
      });
      // Resolver
      connectionFilterRegisterResolver(Self.name, fieldName, resolve);
    };

    const resolveSingle: ConnectionFilterResolver = ({sourceAlias, fieldName, fieldValue, queryBuilder}) => {
      if (fieldValue == null) return null;

      const {foreignTable, foreignKeyAttributes, keyAttributes} = backwardRelationSpecByFieldName[fieldName];

      const foreignTableTypeName = inflection.tableType(foreignTable);

      const foreignTableAlias = sql.identifier(Symbol());
      const foreignTableFilterTypeName = inflection.filterType(foreignTableTypeName);
      const sqlIdentifier = sql.identifier(foreignTable.namespace.name, foreignTable.name);

      /******************************
       * HISTORICAL CHANGES BEGIN
       *******************************/

      const sqlKeysMatch = buildWhereConditionBackward(
        table,
        foreignTableAlias,
        sourceAlias,
        foreignKeyAttributes,
        keyAttributes,
        queryBuilder,
        sql
      );

      const sqlSelectWhereKeysMatch = sql.query`select 1 from ${sqlIdentifier} as ${foreignTableAlias} where ${sqlKeysMatch}`;
      const sqlFragment = connectionFilterResolveBlockHeight(
        fieldValue,
        foreignTableAlias,
        foreignTableFilterTypeName,
        queryBuilder,
        connectionFilterResolve,
        foreignTable,
        sql
      );

      /******************************
       * HISTORICAL CHANGES END
       *******************************/

      return sqlFragment == null ? null : sql.query`exists(${sqlSelectWhereKeysMatch} and (${sqlFragment}))`;
    };

    const resolveExists: ConnectionFilterResolver = ({sourceAlias, fieldName, fieldValue, queryBuilder}) => {
      if (fieldValue == null) return null;

      const {foreignTable, foreignKeyAttributes, keyAttributes} = backwardRelationSpecByFieldName[fieldName];

      const foreignTableAlias = sql.identifier(Symbol());

      const sqlIdentifier = sql.identifier(foreignTable.namespace.name, foreignTable.name);

      /******************************
       * HISTORICAL CHANGES BEGIN
       *******************************/
      const sqlKeysMatch = buildWhereConditionBackward(
        table,
        foreignTableAlias,
        sourceAlias,
        foreignKeyAttributes,
        keyAttributes,
        queryBuilder,
        sql
      );

      /******************************
       * HISTORICAL CHANGES END
       *******************************/

      const sqlSelectWhereKeysMatch = sql.query`select 1 from ${sqlIdentifier} as ${foreignTableAlias} where ${sqlKeysMatch}`;

      return fieldValue === true
        ? sql.query`exists(${sqlSelectWhereKeysMatch})`
        : sql.query`not exists(${sqlSelectWhereKeysMatch})`;
    };

    const makeResolveMany = (backwardRelationSpec: BackwardRelationSpec) => {
      const resolveMany: ConnectionFilterResolver = ({sourceAlias, fieldName, fieldValue, queryBuilder}) => {
        if (fieldValue == null) return null;

        const {foreignTable} = backwardRelationSpecByFieldName[fieldName];

        const foreignTableFilterManyTypeName = inflection.filterManyType(table, foreignTable);
        const sqlFragment = connectionFilterResolve(
          fieldValue,
          sourceAlias,
          foreignTableFilterManyTypeName,
          queryBuilder,
          null,
          null,
          null,
          {backwardRelationSpec}
        );
        return sqlFragment == null ? null : sqlFragment;
      };
      return resolveMany;
    };

    for (const spec of backwardRelationSpecs) {
      const {foreignTable, foreignKeyAttributes, foreignConstraint, isOneToMany} = spec;
      const foreignTableTypeName = inflection.tableType(foreignTable);
      const foreignTableFilterTypeName = inflection.filterType(foreignTableTypeName);
      const ForeignTableFilterType = connectionFilterType(
        newWithHooks,
        foreignTableFilterTypeName,
        foreignTable,
        foreignTableTypeName
      );
      if (!ForeignTableFilterType) continue;

      if (isOneToMany) {
        if (!omit(foreignTable, 'many')) {
          const filterManyTypeName = inflection.filterManyType(table, foreignTable);
          if (!connectionFilterTypesByTypeName[filterManyTypeName]) {
            connectionFilterTypesByTypeName[filterManyTypeName] = newWithHooks(
              GraphQLInputObjectType,
              {
                name: filterManyTypeName,
                description: `A filter to be used against many \`${foreignTableTypeName}\` object types. All fields are combined with a logical ‘and.’`,
              },
              {
                foreignTable,
                isPgConnectionFilterMany: true,
              }
            );
          }
          const FilterManyType = connectionFilterTypesByTypeName[filterManyTypeName];
          const fieldName = useConnectionInflectors
            ? inflection.manyRelationByKeys(foreignKeyAttributes, foreignTable, table, foreignConstraint)
            : inflection.manyRelationByKeysSimple(foreignKeyAttributes, foreignTable, table, foreignConstraint);
          const filterFieldName = inflection.filterManyRelationByKeysFieldName(fieldName);
          addField(
            filterFieldName,
            `Filter by the object’s \`${fieldName}\` relation.`,
            FilterManyType,
            makeResolveMany(spec),
            spec,
            `Adding connection filter backward relation field from ${describePgEntity(table)} to ${describePgEntity(
              foreignTable
            )}`
          );

          const existsFieldName = inflection.filterBackwardManyRelationExistsFieldName(fieldName);
          addField(
            existsFieldName,
            `Some related \`${fieldName}\` exist.`,
            GraphQLBoolean,
            resolveExists,
            spec,
            `Adding connection filter backward relation exists field from ${describePgEntity(
              table
            )} to ${describePgEntity(foreignTable)}`
          );
        }
      } else {
        const fieldName = inflection.singleRelationByKeysBackwards(
          foreignKeyAttributes,
          foreignTable,
          table,
          foreignConstraint
        );
        const filterFieldName = inflection.filterSingleRelationByKeysBackwardsFieldName(fieldName);
        addField(
          filterFieldName,
          `Filter by the object’s \`${fieldName}\` relation.`,
          ForeignTableFilterType,
          resolveSingle,
          spec,
          `Adding connection filter backward relation field from ${describePgEntity(table)} to ${describePgEntity(
            foreignTable
          )}`
        );

        const existsFieldName = inflection.filterBackwardSingleRelationExistsFieldName(fieldName);
        addField(
          existsFieldName,
          `A related \`${fieldName}\` exists.`,
          GraphQLBoolean,
          resolveExists,
          spec,
          `Adding connection filter backward relation exists field from ${describePgEntity(
            table
          )} to ${describePgEntity(foreignTable)}`
        );
      }
    }

    return fields;
  });

  builder.hook('GraphQLInputObjectType:fields', (fields, build, context) => {
    const {
      extend,
      newWithHooks,
      inflection,
      pgSql: sql,
      connectionFilterResolve,
      connectionFilterRegisterResolver,
      connectionFilterTypesByTypeName,
      connectionFilterType,
    } = build;
    const {
      fieldWithHooks,
      scope: {foreignTable, isPgConnectionFilterMany},
      Self,
    } = context;

    if (!isPgConnectionFilterMany || !foreignTable) return fields;

    connectionFilterTypesByTypeName[Self.name] = Self;

    const foreignTableTypeName = inflection.tableType(foreignTable);
    const foreignTableFilterTypeName = inflection.filterType(foreignTableTypeName);
    const FilterType = connectionFilterType(
      newWithHooks,
      foreignTableFilterTypeName,
      foreignTable,
      foreignTableTypeName
    );

    const manyFields = {
      every: fieldWithHooks(
        'every',
        {
          description: `Every related \`${foreignTableTypeName}\` matches the filter criteria. All fields are combined with a logical ‘and.’`,
          type: FilterType,
        },
        {
          isPgConnectionFilterManyField: true,
        }
      ),
      some: fieldWithHooks(
        'some',
        {
          description: `Some related \`${foreignTableTypeName}\` matches the filter criteria. All fields are combined with a logical ‘and.’`,
          type: FilterType,
        },
        {
          isPgConnectionFilterManyField: true,
        }
      ),
      none: fieldWithHooks(
        'none',
        {
          description: `No related \`${foreignTableTypeName}\` matches the filter criteria. All fields are combined with a logical ‘and.’`,
          type: FilterType,
        },
        {
          isPgConnectionFilterManyField: true,
        }
      ),
    };

    const resolve: ConnectionFilterResolver = ({sourceAlias, fieldName, fieldValue, queryBuilder, parentFieldInfo}) => {
      if (fieldValue == null) return null;

      if (!parentFieldInfo || !parentFieldInfo.backwardRelationSpec)
        throw new Error('Did not receive backward relation spec');
      const {keyAttributes, foreignKeyAttributes}: BackwardRelationSpec = parentFieldInfo.backwardRelationSpec;

      const foreignTableAlias = sql.identifier(Symbol());
      const sqlIdentifier = sql.identifier(foreignTable.namespace.name, foreignTable.name);

      /******************************
       * HISTORICAL CHANGES BEGIN
       *******************************/
      const sqlKeysMatch = buildWhereConditionBackward(
        foreignTable,
        foreignTableAlias,
        sourceAlias,
        foreignKeyAttributes,
        keyAttributes,
        queryBuilder,
        sql
      );

      /******************************
       * HISTORICAL CHANGES END
       *******************************/

      const sqlSelectWhereKeysMatch = sql.query`select 1 from ${sqlIdentifier} as ${foreignTableAlias} where ${sqlKeysMatch}`;

      const sqlFragment = connectionFilterResolveBlockHeight(
        fieldValue,
        foreignTableAlias,
        foreignTableFilterTypeName,
        queryBuilder,
        connectionFilterResolve,
        foreignTable,
        sql
      );

      if (sqlFragment == null) {
        return null;
      } else if (fieldName === 'every') {
        return sql.query`not exists(${sqlSelectWhereKeysMatch} and not (${sqlFragment}))`;
      } else if (fieldName === 'some') {
        return sql.query`exists(${sqlSelectWhereKeysMatch} and (${sqlFragment}))`;
      } else if (fieldName === 'none') {
        return sql.query`not exists(${sqlSelectWhereKeysMatch} and (${sqlFragment}))`;
      }
      throw new Error(`Unknown field name: ${fieldName}`);
    };

    for (const fieldName of Object.keys(manyFields)) {
      connectionFilterRegisterResolver(Self.name, fieldName, resolve);
    }

    return extend(fields, manyFields);
  });
};

export interface BackwardRelationSpec {
  table: PgClass;
  keyAttributes: PgAttribute[];
  foreignTable: PgClass;
  foreignKeyAttributes: PgAttribute[];
  foreignConstraint: PgConstraint;
  isOneToMany: boolean;
}

export default PgConnectionArgFilterBackwardRelationsPlugin;
