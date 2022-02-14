// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {makeExtendSchemaPlugin, gql} from 'graphile-utils';

/* eslint-disable  @typescript-eslint/no-empty-function */
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
      extend type Query {
        distinctEvents(on: EventsGroupBy!): EventsConnection!
        distinctExtrinics(on: ExtrinsicsGroupBy!): ExtrinsicsConnection!
        distinctSpecVersions(on: SpecVersionsGroupBy!): SpecVersionsConnection!
      }
    `,
    resolvers: {
      Query: {
        distinctEvents: async (_parentObject, args, _context, info): Promise<any> => {
          if (eventsTableExists) {
            const {text} = sql.compile(args.on.spec());
            const fmtArg = text.slice(1).replace(/['"]+/g, '');
            return info.graphile.selectGraphQLResultFromTable(
              sql.fragment`(select distinct on (${sql.identifier(fmtArg)}) * FROM ${sql.identifier(
                schemaName
              )}.events)`,
              () => {}
            );
          }
          return;
        },
        distinctExtrinics: async (_parentObject, args, _context, info): Promise<any> => {
          if (extrinsicsTableExists) {
            const {text} = sql.compile(args.on.spec());
            const fmtArg = text.slice(1).replace(/['"]+/g, '');
            return info.graphile.selectGraphQLResultFromTable(
              sql.fragment`(select distinct on (${sql.identifier(fmtArg)}) * from ${sql.identifier(
                schemaName
              )}.extrinsics)`,
              () => {}
            );
          }
          return;
        },
        distinctSpecVersions: async (_parentObject, args, _context, info): Promise<any> => {
          if (specVersionTableExists) {
            const {text} = sql.compile(args.on.spec());
            const fmtArg = text.slice(1).replace(/['"]+/g, '');
            return info.graphile.selectGraphQLResultFromTable(
              sql.fragment`(select distinct on (${fmtArg}) * from ${sql.identifier(schemaName)}.spec_versions)`,
              () => {}
            );
          }
          return;
        },
      },
    },
  };
});

export default PgDictionaryPlugin;
