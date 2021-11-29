// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export type MetaData = {
  name: string;
  schema: string;
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
