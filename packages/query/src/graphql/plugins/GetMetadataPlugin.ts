// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
import fetch from 'node-fetch';
import {setAsyncInterval} from '../../utils/asyncInterval';
import {argv} from '../../yargs';

const metaUrl = argv('meta') as string | undefined;

type MetaData = {
  currentProcessingHeight: number;
  currentProcessingTimestamp: number;
  lastProcessedHeight: number;
  lastProcessedTimestamp: number;
  targetHeight: number;
  uptime: number;
  polkadotSdkVersion: string;
  apiConnected: boolean;
  injectedApiConnected: boolean;
  chain: string;
  specName: string;
  genesisHash: string;
  blockTime: number;
};

let metaCache: MetaData;

export const GetMetadataPlugin = makeExtendSchemaPlugin((build) => {
  return {
    typeDefs: gql`
      type Metadata {
        currentProcessingHeight: BigInt
        currentProcessingTimestamp: Date
        lastProcessedHeight: BigInt
        lastProcessedTimestamp: Date
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
        Metadata: () => metaCache,
      },
    },
  };
});

setAsyncInterval(async () => {
  let result;
  try {
    result = await fetch(`${metaUrl}`);
  } catch (e) {
    console.warn(`Failed to fetch indexer meta, `, e.message);
  }
  if (result) {
    metaCache = await result.json();
  }
}, 10000);
