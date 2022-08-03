// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// import {Build, Options} from "graphile-build";
import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
// import {GraphileHelpers} from "graphile-utils/node8plus/fieldHelpers";
// import {GraphQLResolveInfo, GraphQLScalarType} from "graphql";

// const customScalar = new GraphQLScalarType({
//   name: 'distinct',
//   serialize(value) {
//
//   }, parseValue(value) {
//
//     },
//     parseLiteral(ast) {
//
//     }
// })

// async function resolverQuery( _parentObject, args: {[p: string]: any}, _context, info: GraphQLResolveInfo & {graphile: GraphileHelpers<any>}, options: Options): Promise<any> {
//     // const [schemaName] = options.pgSchemas;
//     // const {text} = sql.compile(args.on.spec());
//             // console.log(`text: ${text}`);
//             const fmtArg = text.slice(1).replace(/['"]+/g, '');
//             // console.log(`fmtArg: ${fmtArg}`);
//             return info.graphile.selectGraphQLResultFromTable(
//                 sql.fragment`(select distinct on (${sql.identifier(fmtArg)}) * FROM ${sql.identifier(
//                     schemaName
//                 )}.events)`,
//                 // eslint-disable-next-line @typescript-eslint/no-empty-function
//                 () => {}
//             );
// }

// function generateResolver (build: Build, options): any {
//     const arr = build.pgIntrospectionResultsByKind.constraint
//         .filter((rel: { class: { name: string }}) => rel.class.name !== '_metadata')
//         .map((rel: { class: { name: string }}) => rel.class.name);
//         const Query = {};
//         for (let i = 0; i < arr.length; i++) {
//             const name = `distinct${arr[i].split('_').map((str: string) => str.charAt(0).toUpperCase() + str.slice(1)).join('')}`;
//             Query[name] = resolverQuery();
//             }
//         }
//     return Query;
// }

/* eslint-disable  @typescript-eslint/no-empty-function */
const PgDictionaryPlugin = makeExtendSchemaPlugin((build, options) => {
  const [schemaName] = options.pgSchemas;
  const {pgSql: sql} = build;

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
      console.log(`name: ${name}`);
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
  // function test() {
  //     const Query: any = {}
  //
  //     Query.distinctEvents = async (_parentObject, args, _context, info): Promise<any> => {
  //             const {text} = sql.compile(args.on.spec());
  //             const fmtArg = text.slice(1).replace(/['"]+/g, '');
  //             return info.graphile.selectGraphQLResultFromTable(
  //                 sql.fragment`(select distinct on (${sql.identifier(fmtArg)}) * FROM ${sql.identifier(
  //                     schemaName
  //                 )}.events)`,
  //                 () => {
  //                 }
  //             )
  //     }
  //     return Query;
  // }

  // const eventsTableExists = build.pgIntrospectionResultsByKind.class.find(
  //     (rel: {name: string}) => rel.name === 'events'
  // );
  //
  // const extrinsicsTableExists = build.pgIntrospectionResultsByKind.class.find(
  //     (rel: {name: string}) => rel.name === 'extrinsics'
  // );
  //
  // const specVersionTableExists = build.pgIntrospectionResultsByKind.class.find(
  //     (rel: {name: string}) => rel.name === 'spec_versions'
  // )

  // distinctEvents(on: EventsGroupBy!): EventsConnection!
  // distinctExtrinics(on: ExtrinsicsGroupBy!): ExtrinsicsConnection!
  // distinctSpecVersions(on: SpecVersionsGroupBy!): SpecVersionsConnection!

  function setTypeDefs() {
    const typeDefs = [];

    for (let i = 0; i < arr.length; i++) {
      const name = `distinct${arr[i]
        .split('_')
        .map((str: string) => str.charAt(0).toUpperCase() + str.slice(1))
        .join('')}`;
      typeDefs.push(
        gql`
                    extend type Query {
                        ${name}(on: GroupedBy!): ${name}
                    }`
      );
    }
    return typeDefs;
  }

  // for (let i = 0; i < arr.length; i++) {
  //     const name = `distinct${arr[i].split('_').map((str: string) => str.charAt(0).toUpperCase() + str.slice(1)).join('')}`;
  //     build.addTypeDefs(`
  //         extend type Query {
  //             distinct${name}(on: ${name}GroupBy!): ${name}Connection!
  //         }
  //     `);
  // typeDefs + `extend type Query { distinct${name}(on: ${name}GroupBy!): ${name}Connection! }`

  return {
    // typeDefs: gql`
    //     extend type Query {
    //         distinctEvents(on: EventsGroupBy!): EventsConnection!
    //     }
    // `,
    typeDefs: setTypeDefs(),
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
