// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export enum Metrics {
  ApiConnected = 'subql_indexer_api_connected',
  InjectedApiConnected = 'subql_indexer_injected_api_connected',
  ProcessingHeight = 'subql_indexer_processing_block_height',
  TargetHeight = 'subql_indexer_target_block_height',
  BlockQueueSize = 'subql_indexer_block_queue_size',
}

export interface MetricPayload {
  name: Metrics;
  value: number;
}
