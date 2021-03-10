// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// overwrite the official plugin: https://github.com/graphile/graphile-engine/blob/v4/packages/graphile-build-pg/src/plugins/PgBackwardRelationPlugin.js
// fix the one to one relationship unique key check

import {getLogger} from '../../utils/logger';

const OMIT = 0;
const DEPRECATED = 1;
const ONLY = 2;

const logger = getLogger('graphile-build-pg');

export default function (builder, {pgLegacyRelations, pgSimpleCollections, subscriptions}) {
  const legacyRelationMode =
    {
      only: ONLY,
      deprecated: DEPRECATED,
    }[pgLegacyRelations] || OMIT;
  builder.hook(
    'GraphQLObjectType:fields',
    (fields, build, context) => {
      const {
        describePgEntity,
        extend,
        getSafeAliasFromAlias,
        getSafeAliasFromResolveInfo,
        getTypeByName,
        graphql: {GraphQLList, GraphQLNonNull},
        inflection,
        pgAddStartEndCursor: addStartEndCursor,
        pgGetGqlTypeByTypeIdAndModifier,
        pgIntrospectionResultsByKind: introspectionResultsByKind,
        pgOmit: omit,
        pgQueryFromResolveData: queryFromResolveData,
        pgSql: sql,
        sqlCommentByAddingTags,
      } = build;
      const {
        Self,
        fieldWithHooks,
        scope: {isPgRowType, pgIntrospection: foreignTable},
      } = context;
      if (!isPgRowType || !foreignTable || foreignTable.kind !== 'class') {
        return fields;
      }
      // This is a relation in which WE are foreign
      const foreignKeyConstraints = foreignTable.foreignConstraints.filter((con) => con.type === 'f');
      const foreignTableTypeName = inflection.tableType(foreignTable);
      const gqlForeignTableType = pgGetGqlTypeByTypeIdAndModifier(foreignTable.type.id, null);
      if (!gqlForeignTableType) {
        logger.debug(`Could not determine type for foreign table with id ${foreignTable.type.id}`);
        return fields;
      }

      return extend(
        fields,
        // eslint-disable-next-line complexity
        foreignKeyConstraints.reduce((memo, constraint) => {
          if (omit(constraint, 'read')) {
            return memo;
          }
          const table = introspectionResultsByKind.classById[constraint.classId];
          if (!table) {
            throw new Error(`Could not find the table that referenced us (constraint: ${constraint.name})`);
          }
          if (!table.isSelectable) {
            // Could be a composite type
            return memo;
          }
          const tableTypeName = inflection.tableType(table);
          const gqlTableType = pgGetGqlTypeByTypeIdAndModifier(table.type.id, null);
          if (!gqlTableType) {
            logger.debug(`Could not determine type for table with id ${constraint.classId}`);
            return memo;
          }
          const schema = table.namespace;

          const keys = constraint.keyAttributes;
          const foreignKeys = constraint.foreignKeyAttributes;
          if (!keys.every((_) => _) || !foreignKeys.every((_) => _)) {
            throw new Error('Could not find key columns!');
          }
          if (keys.some((key) => omit(key, 'read'))) {
            return memo;
          }
          if (foreignKeys.some((key) => omit(key, 'read'))) {
            return memo;
          }
          const isUnique = !!table.constraints.find(
            (c) =>
              (c.type === 'p' || c.type === 'f') &&
              c.keyAttributeNums.length === keys.length &&
              c.keyAttributeNums.every((n, i) => keys[i].num === n && keys[i].isUnique)
          );

          const isDeprecated = isUnique && legacyRelationMode === DEPRECATED;

          const singleRelationFieldName = isUnique
            ? inflection.singleRelationByKeysBackwards(keys, table, foreignTable, constraint)
            : null;

          const primaryKeyConstraint = table.primaryKeyConstraint;
          const primaryKeys = primaryKeyConstraint && primaryKeyConstraint.keyAttributes;

          const shouldAddSingleRelation = isUnique && legacyRelationMode !== ONLY;

          const shouldAddManyRelation = !isUnique || legacyRelationMode === DEPRECATED || legacyRelationMode === ONLY;

          if (shouldAddSingleRelation && !omit(table, 'read') && singleRelationFieldName) {
            memo = extend(
              memo,
              {
                [singleRelationFieldName]: fieldWithHooks(
                  singleRelationFieldName,
                  ({addDataGenerator, getDataFromParsedResolveInfoFragment}) => {
                    const sqlFrom = sql.identifier(schema.name, table.name);
                    addDataGenerator((parsedResolveInfoFragment) => {
                      return {
                        pgQuery: (queryBuilder) => {
                          queryBuilder.select(() => {
                            const resolveData = getDataFromParsedResolveInfoFragment(
                              parsedResolveInfoFragment,
                              gqlTableType
                            );
                            const tableAlias = sql.identifier(Symbol());
                            const foreignTableAlias = queryBuilder.getTableAlias();
                            const query = queryFromResolveData(
                              sqlFrom,
                              tableAlias,
                              resolveData,
                              {
                                useAsterisk: false, // Because it's only a single relation, no need
                                asJson: true,
                                addNullCase: true,
                                withPagination: false,
                              },
                              (innerQueryBuilder) => {
                                innerQueryBuilder.parentQueryBuilder = queryBuilder;
                                if (subscriptions && table.primaryKeyConstraint) {
                                  innerQueryBuilder.selectIdentifiers(table);
                                  innerQueryBuilder.makeLiveCollection(table);
                                  innerQueryBuilder.addLiveCondition(
                                    (data) => (record) => {
                                      return keys.every((key) => record[key.name] === data[key.name]);
                                    },
                                    keys.reduce((memo, key, i) => {
                                      memo[key.name] = sql.fragment`${foreignTableAlias}.${sql.identifier(
                                        foreignKeys[i].name
                                      )}`;
                                      return memo;
                                    }, {})
                                  );
                                }
                                keys.forEach((key, i) => {
                                  innerQueryBuilder.where(
                                    sql.fragment`${tableAlias}.${sql.identifier(
                                      key.name
                                    )} = ${foreignTableAlias}.${sql.identifier(foreignKeys[i].name)}`
                                  );
                                });
                              },
                              queryBuilder.context,
                              queryBuilder.rootValue
                            );
                            return sql.fragment`(${query})`;
                          }, getSafeAliasFromAlias(parsedResolveInfoFragment.alias));
                        },
                      };
                    });
                    return {
                      description:
                        constraint.tags.backwardDescription ||
                        build.wrapDescription(
                          `Reads a single \`${tableTypeName}\` that is related to this \`${foreignTableTypeName}\`.`,
                          'field'
                        ),
                      type: gqlTableType,
                      args: {},
                      resolve: (data, _args, resolveContext, resolveInfo) => {
                        const safeAlias = getSafeAliasFromResolveInfo(resolveInfo);
                        const record = data[safeAlias];
                        const liveRecord = resolveInfo.rootValue && resolveInfo.rootValue.liveRecord;
                        const liveCollection = resolveInfo.rootValue && resolveInfo.rootValue.liveCollection;
                        const liveConditions = resolveInfo.rootValue && resolveInfo.rootValue.liveConditions;
                        if (subscriptions && liveCollection && liveConditions && data.__live) {
                          const {__id, ...rest} = data.__live;
                          const condition = liveConditions[__id];
                          const checker = condition(rest);

                          liveCollection('pg', table, checker);
                        }
                        if (record && liveRecord) {
                          liveRecord('pg', table, record.__identifiers);
                        }
                        return record;
                      },
                    };
                  },
                  {
                    pgFieldIntrospection: table,
                    isPgBackwardSingleRelationField: true,
                  }
                ),
              },
              `Backward relation (single) for ${describePgEntity(
                constraint
              )}. To rename this relation with a 'Smart Comment':\n\n  ${sqlCommentByAddingTags(constraint, {
                foreignSingleFieldName: 'newNameHere',
              })}`
            );
          }

          function makeFields(isConnection) {
            const manyRelationFieldName = isConnection
              ? inflection.manyRelationByKeys(keys, table, foreignTable, constraint)
              : inflection.manyRelationByKeysSimple(keys, table, foreignTable, constraint);

            memo = extend(
              memo,
              {
                [manyRelationFieldName]: fieldWithHooks(
                  manyRelationFieldName,
                  ({addDataGenerator, getDataFromParsedResolveInfoFragment}) => {
                    const sqlFrom = sql.identifier(schema.name, table.name);
                    const queryOptions = {
                      useAsterisk: table.canUseAsterisk,
                      withPagination: isConnection,
                      withPaginationAsFields: false,
                      asJsonAggregate: !isConnection,
                    };
                    addDataGenerator((parsedResolveInfoFragment) => {
                      return {
                        pgQuery: (queryBuilder) => {
                          queryBuilder.select(() => {
                            const resolveData = getDataFromParsedResolveInfoFragment(
                              parsedResolveInfoFragment,
                              isConnection ? ConnectionType : TableType
                            );
                            const tableAlias = sql.identifier(Symbol());
                            const foreignTableAlias = queryBuilder.getTableAlias();
                            const query = queryFromResolveData(
                              sqlFrom,
                              tableAlias,
                              resolveData,
                              queryOptions,
                              (innerQueryBuilder) => {
                                innerQueryBuilder.parentQueryBuilder = queryBuilder;
                                if (subscriptions) {
                                  innerQueryBuilder.makeLiveCollection(table);
                                  innerQueryBuilder.addLiveCondition(
                                    (data) => (record) => {
                                      return keys.every((key) => record[key.name] === data[key.name]);
                                    },
                                    keys.reduce((memo, key, i) => {
                                      memo[key.name] = sql.fragment`${foreignTableAlias}.${sql.identifier(
                                        foreignKeys[i].name
                                      )}`;
                                      return memo;
                                    }, {})
                                  );
                                }
                                if (primaryKeys) {
                                  if (subscriptions && !isConnection && table.primaryKeyConstraint) {
                                    innerQueryBuilder.selectIdentifiers(table);
                                  }
                                  innerQueryBuilder.beforeLock('orderBy', () => {
                                    // append order by primary key to the list of orders
                                    if (!innerQueryBuilder.isOrderUnique(false)) {
                                      innerQueryBuilder.data.cursorPrefix = ['primary_key_asc'];
                                      primaryKeys.forEach((key) => {
                                        innerQueryBuilder.orderBy(
                                          sql.fragment`${innerQueryBuilder.getTableAlias()}.${sql.identifier(
                                            key.name
                                          )}`,
                                          true
                                        );
                                      });
                                      innerQueryBuilder.setOrderIsUnique();
                                    }
                                  });
                                }

                                keys.forEach((key, i) => {
                                  innerQueryBuilder.where(
                                    sql.fragment`${tableAlias}.${sql.identifier(
                                      key.name
                                    )} = ${foreignTableAlias}.${sql.identifier(foreignKeys[i].name)}`
                                  );
                                });
                              },
                              queryBuilder.context,
                              queryBuilder.rootValue
                            );
                            return sql.fragment`(${query})`;
                          }, getSafeAliasFromAlias(parsedResolveInfoFragment.alias));
                        },
                      };
                    });
                    const ConnectionType = getTypeByName(inflection.connection(gqlTableType.name));
                    const TableType = pgGetGqlTypeByTypeIdAndModifier(table.type.id, null);
                    return {
                      description:
                        constraint.tags.backwardDescription ||
                        build.wrapDescription(
                          `Reads and enables pagination through a set of \`${tableTypeName}\`.`,
                          'field'
                        ),
                      type: isConnection
                        ? new GraphQLNonNull(ConnectionType)
                        : new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(TableType))),
                      args: {},
                      resolve: (data, _args, resolveContext, resolveInfo) => {
                        const safeAlias = getSafeAliasFromResolveInfo(resolveInfo);
                        const liveCollection = resolveInfo.rootValue && resolveInfo.rootValue.liveCollection;
                        const liveConditions = resolveInfo.rootValue && resolveInfo.rootValue.liveConditions;
                        if (subscriptions && liveCollection && liveConditions && data.__live) {
                          const {__id, ...rest} = data.__live;
                          const condition = liveConditions[__id];
                          const checker = condition(rest);

                          liveCollection('pg', table, checker);
                        }
                        if (isConnection) {
                          return addStartEndCursor(data[safeAlias]);
                        } else {
                          const records = data[safeAlias];
                          const liveRecord = resolveInfo.rootValue && resolveInfo.rootValue.liveRecord;
                          if (primaryKeys && subscriptions && liveRecord) {
                            records.forEach((r) => r && r.__identifiers && liveRecord('pg', table, r.__identifiers));
                          }
                          return records;
                        }
                      },
                      ...(isDeprecated
                        ? {
                            deprecationReason: singleRelationFieldName
                              ? `Please use ${singleRelationFieldName} instead`
                              : `Please use singular instead`, // This should never happen
                          }
                        : null),
                    };
                  },
                  {
                    isPgFieldConnection: isConnection,
                    isPgFieldSimpleCollection: !isConnection,
                    isPgBackwardRelationField: true,
                    pgFieldIntrospection: table,
                  }
                ),
              },

              `Backward relation (${isConnection ? 'connection' : 'simple collection'}) for ${describePgEntity(
                constraint
              )}. To rename this relation with a 'Smart Comment':\n\n  ${sqlCommentByAddingTags(constraint, {
                [isConnection ? 'foreignFieldName' : 'foreignSimpleFieldName']: 'newNameHere',
              })}`
            );
          }

          if (shouldAddManyRelation && !omit(table, 'many') && !omit(constraint, 'many')) {
            const simpleCollections =
              constraint.tags.simpleCollections || table.tags.simpleCollections || pgSimpleCollections;
            const hasConnections = simpleCollections !== 'only';
            const hasSimpleCollections = simpleCollections === 'only' || simpleCollections === 'both';
            if (hasConnections) {
              makeFields(true);
            }
            if (
              hasSimpleCollections &&
              !isUnique // if unique, use the singular instead
            ) {
              makeFields(false);
            }
          }
          return memo;
        }, {}),
        `Adding backward relations for ${Self.name}`
      );
    },
    ['PgBackwardRelation']
  );
}
