// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
import fetch from 'node-fetch';
import {argv} from '../../yargs';

const metaUrl = argv('meta') as string | undefined;

export const GetMetadataPlugin = makeExtendSchemaPlugin((build) => {
  return {
    typeDefs: gql`
      type Metadata {
        currentProcessingHeight: BigInt
        currentProcessingTimestamp: Date
        targetHeight: BigInt
        uptime: Int
        polkadotSdkVersion: String
        apiConnected: Boolean
        injectedApiConnected: Boolean
        chain: String
        specName: String
        genesisHash: String
        blockTime: Int
      }
      extend type Query {
        Metadata: Metadata
      }
    `,
    resolvers: {
      Query: {
        Metadata: async () => {
          return fetch(`${metaUrl}`).then((res) => res.json());
        },
      },
    },
  };
});
