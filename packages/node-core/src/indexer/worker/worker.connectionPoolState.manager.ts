// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable} from '@nestjs/common';
import {ConnectionPoolItem, IApiConnectionSpecific, IConnectionPoolStateManager} from '@subql/node-core';
import {ApiErrorType} from '../connectionPool.service';
import {ConnectionPoolStateManager} from '../connectionPoolState.manager';

export type HostConnectionPoolState<T> = {
  hostGetNextConnectedApiIndex: () => Promise<number | undefined>;
  hostAddToConnections: (endpoint: string, index: number) => Promise<void>;
  hostGetFieldFromConnectionPoolItem: <K extends keyof ConnectionPoolItem<T>>(
    index: number,
    field: K
  ) => Promise<ConnectionPoolItem<T>[K]>;
  hostSetFieldInConnectionPoolItem: <K extends keyof ConnectionPoolItem<T>>(
    index: number,
    field: K,
    value: ConnectionPoolItem<T>[K]
  ) => Promise<void>;
  hostSetTimeoutIdInConnectionPoolItem: (index: number, delay: number) => Promise<void>;
  hostClearTimeoutIdInConnectionPoolItem: (index: number) => Promise<void>;
  hostGetSuspendedIndices: () => Promise<number[]>;
  hostDeleteFromPool: (index: number) => Promise<void>;
  hostHandleApiError: (index: number, errorType: ApiErrorType) => Promise<void>;
  hostHandleApiSuccess: (index: number, responseTime: number) => Promise<void>;
  hostHandleBatchApiSuccess(successResults: Array<{apiIndex: number; responseTime: number}>): Promise<void>;
  hostHandleBatchApiError(errorResults: Array<{apiIndex: number; errorType: ApiErrorType}>): Promise<void>;
  hostGetDisconnectedIndices: () => Promise<number[]>;
  hostShutdownPoolState: () => Promise<void>;
};

export const hostConnectionPoolStateKeys: (keyof HostConnectionPoolState<any>)[] = [
  'hostGetNextConnectedApiIndex',
  'hostAddToConnections',
  'hostGetFieldFromConnectionPoolItem',
  'hostSetFieldInConnectionPoolItem',
  'hostSetTimeoutIdInConnectionPoolItem',
  'hostClearTimeoutIdInConnectionPoolItem',
  'hostGetSuspendedIndices',
  'hostDeleteFromPool',
  'hostHandleApiError',
  'hostHandleApiSuccess',
  'hostHandleBatchApiError',
  'hostHandleBatchApiSuccess',
  'hostGetDisconnectedIndices',
  'hostShutdownPoolState',
];

export function connectionPoolStateHostFunctions<T extends IApiConnectionSpecific>(
  connectionPoolState: ConnectionPoolStateManager<T>
): HostConnectionPoolState<T> {
  return {
    hostAddToConnections: connectionPoolState.addToConnections.bind(connectionPoolState),
    hostGetNextConnectedApiIndex: connectionPoolState.getNextConnectedApiIndex.bind(connectionPoolState),
    hostGetFieldFromConnectionPoolItem: connectionPoolState.getFieldValue.bind(connectionPoolState),
    hostSetFieldInConnectionPoolItem: connectionPoolState.setFieldValue.bind(connectionPoolState),
    hostSetTimeoutIdInConnectionPoolItem: connectionPoolState.setTimeout.bind(connectionPoolState),
    hostClearTimeoutIdInConnectionPoolItem: connectionPoolState.clearTimeout.bind(connectionPoolState),
    hostGetSuspendedIndices: connectionPoolState.getSuspendedIndices.bind(connectionPoolState),
    hostDeleteFromPool: connectionPoolState.deleteFromPool.bind(connectionPoolState),
    hostHandleApiError: connectionPoolState.handleApiError.bind(connectionPoolState),
    hostHandleApiSuccess: connectionPoolState.handleApiSuccess.bind(connectionPoolState),
    hostHandleBatchApiError: connectionPoolState.handleBatchApiError.bind(connectionPoolState),
    hostHandleBatchApiSuccess: connectionPoolState.handleBatchApiSuccess.bind(connectionPoolState),
    hostGetDisconnectedIndices: connectionPoolState.getDisconnectedIndices.bind(connectionPoolState),
    hostShutdownPoolState: connectionPoolState.shutdown.bind(connectionPoolState),
  };
}

@Injectable()
export class WorkerConnectionPoolStateManager<T extends IApiConnectionSpecific>
  implements IConnectionPoolStateManager<T>
{
  constructor(private host: HostConnectionPoolState<any>) {}

  async getNextConnectedApiIndex(): Promise<number | undefined> {
    return this.host.hostGetNextConnectedApiIndex();
  }

  async addToConnections(endpoint: string, index: number): Promise<void> {
    return this.host.hostAddToConnections(endpoint, index);
  }

  async getFieldValue<K extends keyof ConnectionPoolItem<T>>(
    index: number,
    field: K
  ): Promise<ConnectionPoolItem<T>[K]> {
    return this.host.hostGetFieldFromConnectionPoolItem(index, field);
  }

  async setFieldValue<K extends keyof ConnectionPoolItem<T>>(
    index: number,
    field: K,
    value: ConnectionPoolItem<T>[K]
  ): Promise<void> {
    return this.host.hostSetFieldInConnectionPoolItem(index, field, value);
  }

  async setTimeout(index: number, delay: number): Promise<void> {
    return this.host.hostSetTimeoutIdInConnectionPoolItem(index, delay);
  }

  async clearTimeout(index: number): Promise<void> {
    return this.host.hostClearTimeoutIdInConnectionPoolItem(index);
  }

  async getSuspendedIndices(): Promise<number[]> {
    return this.host.hostGetSuspendedIndices();
  }

  async deleteFromPool(index: number): Promise<void> {
    return this.host.hostDeleteFromPool(index);
  }

  async handleApiError(index: number, errorType: ApiErrorType): Promise<void> {
    return this.host.hostHandleApiError(index, errorType);
  }

  async handleApiSuccess(index: number, responseTime: number): Promise<void> {
    return this.host.hostHandleApiSuccess(index, responseTime);
  }

  async handleBatchApiSuccess(successResults: Array<{apiIndex: number; responseTime: number}>): Promise<void> {
    return this.host.hostHandleBatchApiSuccess(successResults);
  }

  async handleBatchApiError(errorResults: Array<{apiIndex: number; errorType: ApiErrorType}>): Promise<void> {
    return this.host.hostHandleBatchApiError(errorResults);
  }

  async getDisconnectedIndices(): Promise<number[]> {
    return this.host.hostGetDisconnectedIndices();
  }

  async shutdown(): Promise<void> {
    return this.host.hostShutdownPoolState();
  }
}
