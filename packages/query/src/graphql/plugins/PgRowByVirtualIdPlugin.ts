// Copyright 2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Plugin} from 'graphile-build';

// Copied from graphile-build-pg/node8plus/plugins/PgRowByUniqueConstraint.ts
// Modified to overwrite hidden column _id primary key with id column
export const PgRowByVirtualIdPlugin: Plugin = (builder) => {
  builder.hook('GraphQLObjectType:fields', (fields, build, context) => {
    const {
      extend,
      gql2pg,
      graphql: {GraphQLNonNull},
      inflection,
      parseResolveInfo,
      pgGetGqlInputTypeByTypeIdAndModifier,
      pgGetGqlTypeByTypeIdAndModifier,
      pgIntrospectionResultsByKind: introspectionResultsByKind,
      pgOmit: omit,
      pgPrepareAndRun,
      pgQueryFromResolveData: queryFromResolveData,
      pgSql: sql,
    } = build;
    const {
      fieldWithHooks,
      scope: {isRootQuery},
    } = context;

    if (!isRootQuery) {
      return fields;
    }

    return extend(
      fields,
      introspectionResultsByKind.class.reduce((memo, table) => {
        if (!table.namespace) return memo;
        if (omit(table, 'read')) return memo;

        const TableType = pgGetGqlTypeByTypeIdAndModifier(table.type.id, null);
        const sqlFullTableName = sql.identifier(table.namespace.name, table.name);
        if (TableType) {
          const uniqueConstraints = table.constraints.filter((con) => con.type === 'u' || con.type === 'p');
          uniqueConstraints.forEach((constraint) => {
            if (omit(constraint, 'read')) {
              return;
            }
            const keys = constraint.keyAttributes;
            // Only for _id primary key
            if (keys.length !== 1 || keys[0].name !== '_id') {
              return;
            }
            const fieldName = inflection.rowByUniqueKeys(keys, table, constraint);
            // Find id column
            const idColumn = table.attributes.find(({name}) => name === 'id');
            if (!idColumn) {
              return;
            }
            // Overwrite with id column
            const keysIncludingMeta = [
              {
                ...idColumn,
                sqlIdentifier: sql.identifier(idColumn.name),
                columnName: inflection.column(idColumn),
              },
            ];
            const queryFromResolveDataOptions = {
              useAsterisk: false,
            };
            const queryFromResolveDataCallback = (queryBuilder, args) => {
              const sqlTableAlias = queryBuilder.getTableAlias();
              keysIncludingMeta.forEach(({columnName, sqlIdentifier, type, typeModifier}) => {
                queryBuilder.where(
                  sql.fragment`${sqlTableAlias}.${sqlIdentifier} = ${gql2pg(args[columnName], type, typeModifier)}`
                );
              });
            };

            memo[fieldName] = fieldWithHooks(
              fieldName,
              ({getDataFromParsedResolveInfoFragment}) => {
                return {
                  type: TableType,
                  args: keysIncludingMeta.reduce((memo, {columnName, name, typeId, typeModifier}) => {
                    const InputType = pgGetGqlInputTypeByTypeIdAndModifier(typeId, typeModifier);
                    if (!InputType) {
                      throw new Error(`Could not find input type for key '${name}' on type '${TableType.name}'`);
                    }
                    memo[columnName] = {
                      type: new GraphQLNonNull(InputType),
                    };
                    return memo;
                  }, {}),
                  async resolve(parent, args, resolveContext, resolveInfo) {
                    const {pgClient} = resolveContext;
                    const parsedResolveInfoFragment = parseResolveInfo(resolveInfo);
                    parsedResolveInfoFragment.args = args; // Allow overriding via makeWrapResolversPlugin
                    const resolveData = getDataFromParsedResolveInfoFragment(parsedResolveInfoFragment, TableType);
                    const query = queryFromResolveData(
                      sqlFullTableName,
                      undefined,
                      resolveData,
                      queryFromResolveDataOptions,
                      (queryBuilder) => queryFromResolveDataCallback(queryBuilder, args),
                      resolveContext,
                      resolveInfo.rootValue
                    );
                    const {text, values} = sql.compile(query);
                    const {
                      rows: [row],
                    } = await pgPrepareAndRun(pgClient, text, values);
                    return row;
                  },
                };
              },
              {
                isPgRowByUniqueConstraintField: true,
                pgFieldIntrospection: constraint,
              }
            );
          });
        }
        return memo;
      }, {})
    );
  });
};
