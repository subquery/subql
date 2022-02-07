// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {makeExtendSchemaPlugin, gql} from 'graphile-utils';

const PgDictionaryPlugin = makeExtendSchemaPlugin((build, options) => {
  const {pgSql: sql} = build;
  const [schemaName] = options.pgSchemas;
  //maybe have a flag to enable this for a dictionary service.

  //TODO: Possibly Add Plugin using builder.hook so I only have to do table search up once.
  //      I might be able to combine this with earch of my other 2 plugins to let them know if table exists.
  //      Ask benje why introspection query fires so much.

  //TODO: When there is a flag do some sort of validation to check that all these tables and columns exist
  //      but do outside this file so it doesn't get called everytime there is a query.

  //TODO: still be able to apply all the filters

  // const psuedo =  `select distinct on (blockHeight) block_height from "d-9955/subquery/dictionary-kusama".events
  // where module = 'balances' and event='Transfer' and block_height between 370000 and 400000
  // order by block_height limit 20`

  //TODO: will need to do a introspection or have a flag to decide
  //TODO: I actually only need to resolve 1 field which is keys
  //TODO: column needs to be an enum that maps to returned sql statement
  //TODO: figure out when to use selectGraphQLResultFromTable vs

  //If I can't use filter I need to add arguments for distinctEvents & distinctExtrinsics.

  return {
    typeDefs: gql`
      # enum Columns {
      #   blockHeight:
      #   # Maybe any else?
      # }

      type Keys {
        values: String
      }

      extend type Query {
        #distinctEventHeights?
        distinctEvent(on: String!): [Keys]
        distinctExtrinsics(on: String!): [Keys]
      }
    `,
    resolvers: {
      Query: {
        distinctEvents: async (_query, args, context, resolveInfo) => {
          console.log(args);
          return;
          const rows = await resolveInfo.graphile.selectGraphQLResultFromTable(
            sql.fragment`(select distinct on (${args.column}}) from "${schemaName}".Events(${sql.value(
              args.searchText
            )}))`,
            (_tableAlias, queryBuilder) => {
              queryBuilder;
              queryBuilder.limit(100);
            }
          );
          return rows[0];
        },
        distinctExtrinsics: async (_query, args, context, resolveInfo) => {
          console.log(args);
          return;
          const rows = await resolveInfo.graphile.selectGraphQLResultFromTable(
            sql.fragment`(select distinct on (${args.column}}) from "${schemaName}".Events(${sql.value(
              args.searchText
            )}))`,
            (_tableAlias, queryBuilder) => {
              queryBuilder;
              queryBuilder.limit(50);
            }
          );
          return rows;
        },
      },
    },
  };
});

export default PgDictionaryPlugin;
