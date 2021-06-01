// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import url from 'url';
import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
import fetch from 'node-fetch';
// @ts-ignore
import {version} from '../../../package.json';
import {setAsyncInterval} from '../../utils/asyncInterval';
import {argv} from '../../yargs';

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
  queryNodeVersion: version,
} as MetaData;

export const GetMetadataPlugin = makeExtendSchemaPlugin((build) => {
  return {
    typeDefs: gql`
      type Metadata {
        lastProcessedHeight: BigInt
        lastProcessedTimestamp: Date
        targetHeight: BigInt
        chain: String
        specName: String
        genesisHash: String
        indexerHealthy: Boolean
        indexerNodeVersion: String
        queryNodeVersion: String
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
  let health;
  let meta;
  try {
    meta = await fetch(url.resolve(indexerUrl, `meta`));
  } catch (e) {
    console.warn(`Failed to fetch indexer meta, `, e.message);
  }
  if (meta) {
    const result = await meta.json();
    Object.assign(metaCache, result);
  }

  try {
    health = await fetch(url.resolve(indexerUrl, `health`));
  } catch (e) {
    console.warn(`Failed to fetch indexer health, `, e.message);
  }
  if (health && health.ok) {
    metaCache.indexerHealthy = true;
  } else {
    metaCache.indexerHealthy = false;
  }
}, 10000);
