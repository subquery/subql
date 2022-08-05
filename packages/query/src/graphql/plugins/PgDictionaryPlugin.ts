// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// import {Build, Options} from "graphile-build";
import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
// import {Plugin} from 'graphile-build';

// import {GraphileHelpers} from "graphile-utils/node8plus/fieldHelpers";
// import {GraphQLResolveInfo, GraphQLScalarType} from "graphql";

/* eslint-disable  @typescript-eslint/no-empty-function */
const PgDictionaryPlugin = makeExtendSchemaPlugin((build, options) => {
  const [schemaName] = options.pgSchemas;
  const {pgSql: sql} = build;
  // console.log('dict plugin: ',sql)

  const arr = build.pgIntrospectionResultsByKind.constraint
    .filter((rel: {class: {name: string}}) => rel.class.name !== '_metadata')
    .map((rel: {class: {name: string}}) => rel.class.name);

  function processResolver(arr: string[]) {
    const Queries = {};
    for (let i = 0; i < arr.length; i++) {
      const name = `distinct${arr[i]
        .split('_')
        .map((str: string) => str.charAt(0).toUpperCase() + str.slice(1))
        .join('')}`;
      // eslint-disable-next-line @typescript-eslint/require-await
      Queries[name] = async (_parentObject, args, _context, info): Promise<any> => {
        const {text} = sql.compile(args.on.spec());
        const fmtArg = text.slice(1).replace(/['"]+/g, '');
        return info.graphile.selectGraphQLResultFromTable(
          sql.fragment`(select distinct on (${sql.identifier(fmtArg)}) * FROM ${sql.identifier(schemaName)}.events)`,
          () => {}
        );
      };
    }
    if (Object.keys(Queries).length > 0) {
      return Queries;
    } else {
      throw new Error('No Queries');
    }
  }

  return {
    typeDefs: gql`
      extend type Query {
        distinctEvents(on: EventsGroupBy!): EventsConnection!
        distinctExtrinics(on: ExtrinsicsGroupBy!): ExtrinsicsConnection!
        distinctSpecVersions(on: SpecVersionsGroupBy!): SpecVersionsConnection!
      }
    `,
    // typeDefs: setTypeDefs(),
    resolvers: {
      Query: processResolver(arr),
    },

    // START
    // resolvers: {
    //     Query: {
    //         distinctEvents: async (_parentObject, args, _context, info): Promise<any> => {
    //             if (eventsTableExists) {
    //                 const {text} = sql.compile(args.on.spec());
    //                 const fmtArg = text.slice(1).replace(/['"]+/g, '');
    //                 return info.graphile.selectGraphQLResultFromTable(
    //                     sql.fragment`(select distinct on (${sql.identifier(fmtArg)}) * FROM ${sql.identifier(
    //                         schemaName
    //                     )}.events)`,
    //                     () => {
    //                     }
    //                 );
    //             }
    //             return;
    //         },
    //         distinctExtrinics: async (_parentObject, args, _context, info): Promise<any> => {
    //             if (extrinsicsTableExists) {
    //                 const {text} = sql.compile(args.on.spec());
    //                 console.log(`text: ${text}`);
    //
    //                 const fmtArg = text.slice(1).replace(/['"]+/g, '');
    //                 console.log(`fmtArg: ${fmtArg}`);
    //
    //                 return info.graphile.selectGraphQLResultFromTable(
    //                     sql.fragment`(select distinct on (${sql.identifier(fmtArg)}) * from ${sql.identifier(
    //                         schemaName
    //                     )}.extrinsics)`,
    //                     () => {
    //                     }
    //                 );
    //             }
    //             return;
    //         },
    //         distinctSpecVersions: async (_parentObject, args, _context, info): Promise<any> => {
    //             if (specVersionTableExists) {
    //                 const {text} = sql.compile(args.on.spec());
    //                 console.log(`text: ${text}`);
    //                 const fmtArg = text.slice(1).replace(/['"]+/g, '');
    //                 console.log(`fmtArg: ${fmtArg}`);
    //                 return info.graphile.selectGraphQLResultFromTable(
    //                     sql.fragment`(select distinct on (${fmtArg}) * from ${sql.identifier(schemaName)}.spec_versions)`,
    //                     () => {
    //                     }
    //                 );
    //             }
    //             return;
    //         },
    //     },
    // }
    // END
  };
});

export default PgDictionaryPlugin;
