// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export enum IndexerEvent {
  ApiConnected = 'api_connected_status',
  InjectedApiConnected = 'injected_api_connected_status',
  BlockTarget = 'block_target_height',
  BlockProcessing = 'block_processing_height',
  BlockQueueSize = 'block_queue_size',
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
