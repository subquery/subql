// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {blockHeightStepMap} from './historical/PgBlockHeightPlugin';

export const PgAggregatesHistoricalPlugin: GraphileConfig.Plugin = {
  name: 'PgAggregatesHistoricalPlugin',
  version: '0.0.0',
  provides: ['aggregates'],
  schema: {
    behaviorRegistry: {
      add: {
        'relatedAggregates:orderBy': {
          description: '',
          entities: ['pgResource'],
        },
        'aggregates:orderBy': {
          description: '',
          entities: ['pgCodecRelation'],
        },
        'aggregate:orderBy': {
          description: '',
          entities: ['pgCodecAttribute'],
        },
      } as any,
    },
    entityBehavior: {
      pgResource: 'resource:relatedAggregates:orderBy' as any,
      pgCodecRelation: ['select', 'manyRelation:aggregates:orderBy'] as any,
      pgCodecAttribute: ['attribute:aggregate:orderBy'] as any,
    },
    hooks: {
      GraphQLEnumType_values(values, build: any, context: any) {
        const {
          EXPORTABLE,
          dataplanPg: {TYPES},
          extend,
          inflection,
          sql,
        } = build;

        const pgAggregateSpecs = build.pgAggregateSpecs;
        const {
          scope: {isPgRowSortEnum, pgCodec, pgTypeResource},
        } = context;

        const foreignTable =
          pgTypeResource ??
          Object.values(build.input.pgRegistry.pgResources).find((s: any) => s.codec === pgCodec && !s.parameters);

        if (
          !isPgRowSortEnum ||
          !foreignTable ||
          (foreignTable as any).parameters ||
          !(foreignTable as any).codec.attributes
        ) {
          return values;
        }

        if (!build.behavior.pgResourceMatches(foreignTable, 'resource:relatedAggregates:orderBy' as any)) {
          return values;
        }

        const relations = (foreignTable as any).getRelations();
        const referenceeRelations = Object.entries(relations).filter(([, rel]: any) => rel.isReferencee);

        const newValues = referenceeRelations.reduce((memo: any, [relationName, relation]: any) => {
          if (!build.behavior.pgCodecRelationMatches(relation, 'select' as any)) {
            return memo;
          }
          if (!build.behavior.pgCodecRelationMatches(relation, 'manyRelation:aggregates:orderBy' as any)) {
            return memo;
          }

          const table = relation.remoteResource;
          const isUnique = !!relation.isUnique;
          if (isUnique) {
            return memo;
          }

          const remoteHasBlockRange = '_block_range' in (table?.codec?.attributes ?? {});

          // Add count
          const totalCountBaseName = (inflection as any).orderByCountOfManyRelationByKeys({
            registry: (foreignTable as any).registry,
            codec: (foreignTable as any).codec,
            relationName,
          });

          const makeTotalCountApply = (direction: string) => {
            return EXPORTABLE(
              (TYPES: any, direction: string, relation: any, sql: any, table: any, remoteHasBlockRange: boolean) =>
                function apply($select: any) {
                  const foreignTableAlias = $select.alias;
                  const conditions: any[] = [];
                  const tableAlias = sql.identifier(Symbol(table.name));

                  relation.localAttributes.forEach((localAttribute: string, i: number) => {
                    const remoteAttribute = relation.remoteAttributes[i];
                    conditions.push(
                      sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`
                    );
                  });

                  if (remoteHasBlockRange) {
                    const blockHeightStep = blockHeightStepMap.get($select);
                    if (blockHeightStep) {
                      conditions.push(sql.fragment`${tableAlias}._block_range @> ${blockHeightStep}`);
                    }
                  }

                  if (typeof table.from === 'function') {
                    throw new Error('Function source unsupported');
                  }
                  const fragment = sql`(${sql.indent`select count(*)
from ${table.from} ${tableAlias}
where ${sql.parens(
                    sql.join(
                      conditions.map((c: any) => sql.parens(c)),
                      ' AND '
                    )
                  )}`})`;
                  $select.orderBy({
                    fragment,
                    codec: TYPES.bigint,
                    direction,
                  });
                },
              [TYPES, direction, relation, sql, table, remoteHasBlockRange]
            );
          };

          memo = extend(
            memo,
            {
              [`${totalCountBaseName}_ASC`]: {
                extensions: {
                  grafast: {
                    apply: makeTotalCountApply('ASC'),
                  },
                },
              },
              [`${totalCountBaseName}_DESC`]: {
                extensions: {
                  grafast: {
                    apply: makeTotalCountApply('DESC'),
                  },
                },
              },
            },
            `Adding orderBy count to '${(foreignTable as any).name}' using relation '${relationName}'`
          );

          // Add other aggregates
          pgAggregateSpecs.forEach((aggregateSpec: any) => {
            if (
              !build.behavior.pgCodecRelationMatches(
                relation,
                `${aggregateSpec.id}:manyRelation:aggregates:orderBy` as any
              )
            ) {
              return;
            }

            for (const [attributeName, attribute] of Object.entries(table.codec.attributes)) {
              if (
                !build.behavior.pgCodecAttributeMatches(
                  [table.codec, attributeName],
                  `${aggregateSpec.id}:attribute:aggregate:orderBy` as any
                )
              ) {
                continue;
              }

              if (
                (aggregateSpec.shouldApplyToEntity &&
                  !aggregateSpec.shouldApplyToEntity({
                    type: 'attribute',
                    codec: table.codec,
                    attributeName,
                  })) ||
                !aggregateSpec.isSuitableType((attribute as any).codec)
              ) {
                continue;
              }

              const baseName = (inflection as any).orderByAttributeAggregateOfManyRelationByKeys({
                registry: (foreignTable as any).registry,
                codec: (foreignTable as any).codec,
                relationName,
                attributeName,
                aggregateSpec,
              });

              const makeApply = (direction: string) => {
                return EXPORTABLE(
                  (
                    aggregateSpec: any,
                    attribute: any,
                    attributeName: string,
                    direction: string,
                    relation: any,
                    sql: any,
                    table: any,
                    remoteHasBlockRange: boolean
                  ) =>
                    function apply($select: any) {
                      const foreignTableAlias = $select.alias;
                      const conditions: any[] = [];
                      const tableAlias = sql.identifier(Symbol(table.name));

                      relation.localAttributes.forEach((localAttribute: string, i: number) => {
                        const remoteAttribute = relation.remoteAttributes[i];
                        conditions.push(
                          sql.fragment`${tableAlias}.${sql.identifier(remoteAttribute)} = ${foreignTableAlias}.${sql.identifier(localAttribute)}`
                        );
                      });

                      if (remoteHasBlockRange) {
                        const blockHeightStep = blockHeightStepMap.get($select);
                        if (blockHeightStep) {
                          conditions.push(sql.fragment`${tableAlias}._block_range @> ${blockHeightStep}`);
                        }
                      }

                      if (typeof table.from === 'function') {
                        throw new Error('Function source unsupported');
                      }
                      const fragment = sql`(${sql.indent`
select ${aggregateSpec.sqlAggregateWrap(sql.fragment`${tableAlias}.${sql.identifier(attributeName)}`, attribute.codec)}
from ${table.from} ${tableAlias}
where ${sql.join(
                        conditions.map((c: any) => sql.parens(c)),
                        ' AND '
                      )}`})`;
                      $select.orderBy({
                        fragment,
                        codec: aggregateSpec.pgTypeCodecModifier?.(attribute.codec) ?? attribute.codec,
                        direction,
                      });
                    },
                  [aggregateSpec, attribute, attributeName, direction, relation, sql, table, remoteHasBlockRange]
                );
              };

              memo = extend(
                memo,
                {
                  [`${baseName}_ASC`]: {
                    extensions: {
                      grafast: {
                        apply: makeApply('ASC'),
                      },
                    },
                  },
                  [`${baseName}_DESC`]: {
                    extensions: {
                      grafast: {
                        apply: makeApply('DESC'),
                      },
                    },
                  },
                },
                `Adding orderBy ${aggregateSpec.id} of '${attributeName}' to '${(foreignTable as any).name}' using constraint '${relationName}'`
              );
            }
          });

          return memo;
        }, Object.create(null));

        return extend(values, newValues, `Adding aggregate orders to '${(foreignTable as any).name}'`);
      },
    },
  },
};
