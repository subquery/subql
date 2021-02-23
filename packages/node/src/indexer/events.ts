// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export enum IndexerEvent {
  ApiConnected = 'subql_indexer_api_connected',
  InjectedApiConnected = 'subql_indexer_injected_api_connected',
  BlockTarget = 'subql_indexer_block_target_height',
  BlockProcessing = 'subql_indexer_block_processing_height',
  BlockQueueSize = 'subql_indexer_block_queue_size',
  NetworkMetadata = 'subql_indexer_network_metadata',
}

export interface ProcessingBlockPayload {
  height: number;
  timestamp: number;
}

export interface TargetBlockPayload {
  height: number;
}

export interface EventPayload<T> {
  value: T;
}

export interface NetworkMetadataPayload {
  chain: string;
  specName: string;
  genesisHash: string;
}
