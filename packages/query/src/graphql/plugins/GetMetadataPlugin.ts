// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import url from 'url';
import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
import fetch from 'node-fetch';
import {setAsyncInterval} from '../../utils/asyncInterval';
import {argv} from '../../yargs';
const {version: packageVersion} = require('../../../package.json');

const indexerUrl = argv('indexer') as string | undefined;

type MetaData = {
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

const metaCache = {
  queryNodeVersion: packageVersion,
} as MetaData;

export const GetMetadataPlugin = makeExtendSchemaPlugin((build) => {
  setAsyncInterval(async () => {
    let health;
    let meta;
    try {
      meta = await fetch(new URL(`meta`, indexerUrl));
      const result = await meta.json();
      Object.assign(metaCache, result);
    } catch (e) {
      metaCache.indexerHealthy = false;
      console.warn(`Failed to fetch indexer meta, `, e.message);
    }

    try {
      health = await fetch(new URL(`health`, indexerUrl));
      metaCache.indexerHealthy = !!health.ok;
    } catch (e) {
      metaCache.indexerHealthy = false;
      console.warn(`Failed to fetch indexer health, `, e.message);
    }
  }, 10000);

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
        _metadata: () => metaCache,
      },
    },
  };
});
