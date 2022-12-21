// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export type TableEstimate = {
  table: string;
  estimate: number;
};

export type MetaData = {
  lastProcessedHeight: number;
  lastProcessedTimestamp: number;
  targetHeight: number;
  chain: string;
  specName: string;
  genesisHash: string;
  indexerHealthy: boolean;
  indexerNodeVersion: string;
  queryNodeVersion: string;
  startHeight?: number;
  rowCountEstimate: [TableEstimate];
};

export type TerraMetaData = {
  lastProcessedHeight: number;
  lastProcessedTimestamp: number;
  targetHeight: number;
  chain: string; // Was a bug in the dictionary, should have been chainId
  indexerHealthy: boolean;
  indexerNodeVersion: string;
  queryNodeVersion: string;
};
