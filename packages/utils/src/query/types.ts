// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export type TableEstimate = {
  table: string;
  estimate: number;
};

export type MetaData = {
  lastProcessedHeight: number;
  lastProcessedBlockTimestamp: number;
  lastProcessedTimestamp: number;
  targetHeight: number;
  chain: string;
  specName: string;
  genesisHash: string;
  indexerHealthy: boolean;
  indexerNodeVersion: string;
  queryNodeVersion: string;
  startHeight?: number;
  rowCountEstimate: TableEstimate[];
  deployments: Record<number, string>;
  historicalStateEnabled: boolean | 'height' | 'timestamp';
};
