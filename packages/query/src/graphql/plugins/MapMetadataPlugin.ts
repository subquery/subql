// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
const {version: packageVersion} = require('../../../package.json');

type Metadata = {
  lastProcessedHeight: number;
  lastProcessedTimestamp: number;
  targetHeight: number;
  chain: string;
  specName: string;
  genesisHash: string;
  indexerHealthy: boolean;
  indexerNodeVersion: string;
  queryNodeVersion: string;
};

export const MapMetadataPlugin = makeExtendSchemaPlugin((build) => {
  return {
    typeDefs: gql`
      type _Metadata {
        lastProcessedHeight: Int
        lastProcessedTimestamp: Date
        targetHeight: Int
        chain: String
        specName: String
        genesisHash: String
        indexerHealthy: Boolean
        indexerNodeVersion: String
        queryNodeVersion: String
      }
      extend type Query {
        _metadata: _Metadata
      }
    `,
    resolvers: {
      Query: {
        _metadata: async (parentObject, args, context, info): Promise<Metadata> => {
          const {rows} = await context.pgClient.query('select * from subquery_1._metadata');

          const metadata = {} as Metadata;

          rows.map((row: {key: string; value: string | number}) => {
            const key = row.key;
            const value = row.value;
            metadata[key] = value;
          });

          metadata.queryNodeVersion = packageVersion;

          return metadata;
        },
      },
    },
  };
});
