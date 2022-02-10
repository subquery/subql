// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {QueryBuilder} from 'graphile-build-pg';
import {makeExtendSchemaPlugin, gql} from 'graphile-utils';

const SORT_ARGS = {
  lessThan: '<',
  lessThanOrEqualTo: '<=',
  greaterThan: '>',
  greaterThanOrEqualTo: '>=',
};

const generateArgs = (queryBuilder: QueryBuilder, args, sql) => {
  queryBuilder.orderBy(sql.fragment`block_height`, true);

  if (args.first) {
    queryBuilder.first(args.first);
  }

  if (args.filter) {
    const filter = args.filter;

    if (filter.module) {
      queryBuilder.where(sql.fragment`module = ${sql.value(filter.module)}`);
    }
    if (filter.call) {
      queryBuilder.where(sql.fragment`call = ${sql.value(filter.call)}`);
    }
    if (filter.event) {
      queryBuilder.where(sql.fragment`event = ${sql.value(filter.event)}`);
    }

    if (filter.blockHeight) {
      const heightFilter = filter.blockHeight;

      if (heightFilter.isEqualTo) {
        queryBuilder.where(sql.fragment`block_height = ${sql.value(filter.blockHeight)}`);
      } else if (heightFilter.sort) {
        const sort = heightFilter.sort;

        for (const i in sort) {
          const value = sort[i];
          if (SORT_ARGS[i]) {
            queryBuilder.where(sql.join([sql.fragment`block_height`, sql.value(value)], SORT_ARGS[i]));
          }
        }
      }
    }
  }
};

const PgDictionaryPlugin = makeExtendSchemaPlugin((build, options) => {
  const [schemaName] = options.pgSchemas;
  const {pgSql: sql} = build;

  const eventsTableExists = build.pgIntrospectionResultsByKind.class.find(
    (rel: {name: string}) => rel.name === 'events'
  );

  const extrinsicsTableExists = build.pgIntrospectionResultsByKind.class.find(
    (rel: {name: string}) => rel.name === 'extrinsics'
  );

  const specVersionTableExists = build.pgIntrospectionResultsByKind.class.find(
    (rel: {name: string}) => rel.name === 'spec_versions'
  );

  return {
    typeDefs: gql`
      input SortOperators {
        lessThan: Int
        lessThanOrEqualTo: Int
        greaterThan: Int
        greaterThanOrEqualTo: Int
      }

      input BlockHeightFilter @oneOf {
        sort: SortOperators
        isEqualTo: Int
      }

      input FilterDistinctEvents {
        module: String
        event: String
        blockHeight: BlockHeightFilter
      }

      input FilterDistinctExtrinsics {
        module: String
        call: String
        blockHeight: BlockHeightFilter
      }

      input FilterDistinctSpecVersions {
        blockHeight: BlockHeightFilter
      }

      #TODO: update "on" to be enum
      #TODO: updating typing on resolver promises
      extend type Query {
        distinctEvents(on: String!, first: Int, filter: FilterDistinctEvents): [Event!]
        distinctExtrinics(on: String!, first: Int, filter: FilterDistinctExtrinsics): [Extrinsic!]
        distinctSpecVersions(on: String!, first: Int, filter: FilterDistinctSpecVersions): [SpecVersion!]
      }
    `,
    resolvers: {
      Query: {
        distinctEvents: async (_parentObject, args, _context, info): Promise<any> => {
          if (eventsTableExists) {
            return info.graphile.selectGraphQLResultFromTable(
              sql.fragment`(select distinct on (${sql.identifier(args.on)}) * from ${sql.identifier(
                schemaName
              )}.events)`,
              (_tableAlias, queryBuilder) => generateArgs(queryBuilder, args, sql)
            );
          }
          return;
        },
        distinctExtrinics: async (_parentObject, args, _context, info): Promise<any> => {
          if (extrinsicsTableExists) {
            return info.graphile.selectGraphQLResultFromTable(
              sql.fragment`(select distinct on (${sql.identifier(args.on)}) * from ${sql.identifier(
                schemaName
              )}.extrinsics)`,
              (_tableAlias, queryBuilder) => generateArgs(queryBuilder, args, sql)
            );
          }
          return;
        },
        distinctSpecVersions: async (_parentObject, args, _context, info): Promise<any> => {
          if (specVersionTableExists) {
            return info.graphile.selectGraphQLResultFromTable(
              sql.fragment`(select distinct on (${sql.identifier(args.on)}) * from ${sql.identifier(
                schemaName
              )}.spec_versions)`,
              (_tableAlias, queryBuilder) => generateArgs(queryBuilder, args, sql)
            );
          }
          return;
        },
      },
    },
  };
});

export default PgDictionaryPlugin;
