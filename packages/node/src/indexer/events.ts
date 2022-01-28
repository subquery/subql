// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export enum IndexerEvent {
  ApiConnected = 'api_connected',
  InjectedApiConnected = 'injected_api_connected',
  BlockTarget = 'block_target_height',
  BlockBest = 'block_best_height',
  BlockProcessing = 'block_processing_height',
  BlockLastProcessed = 'block_processed_height',
  BlockQueueSize = 'block_queue_size',
  BlocknumberQueueSize = 'blocknumber_queue_size',
  NetworkMetadata = 'network_metadata',
  UsingDictionary = 'using_dictionary',
  SkipDictionary = 'skip_dictionary',
}

export interface ProcessBlockPayload {
  height: number;
  timestamp: number;
}

export interface TargetBlockPayload {
  height: number;
}

export interface BestBlockPayload {
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
