// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'node:worker_threads';
import {Injectable} from '@nestjs/common';
import {ApiErrorType} from '../../api.connection.error';
import {IApiConnectionSpecific} from '../../api.service';
import {
  ConnectionPoolStateManager,
  ConnectionPoolItem,
  IConnectionPoolStateManager,
} from '../connectionPoolState.manager';

export type HostConnectionPoolState<T> = {
  hostGetNextConnectedEndpoint: () => Promise<string | undefined>;
  hostAddToConnections: (endpoint: string, primary: boolean) => Promise<void>;
  hostGetFieldFromConnectionPoolItem: <K extends keyof ConnectionPoolItem<T>>(
    endpoint: string,
    field: K
  ) => Promise<ConnectionPoolItem<T>[K]>;
  hostSetFieldInConnectionPoolItem: <K extends keyof ConnectionPoolItem<T>>(
    endpoint: string,
    field: K,
    value: ConnectionPoolItem<T>[K]
  ) => Promise<void>;
  hostGetSuspendedEndpoints: () => Promise<string[]>;
  hostRemoveFromConnections: (endpoint: string) => Promise<void>;
  hostHandleBatchApiSuccess(successResults: Array<{endpoint: string; responseTime: number}>): Promise<void>;
  hostHandleBatchApiError(errorResults: Array<{endpoint: string; errorType: ApiErrorType}>): Promise<void>;
  hostGetDisconnectedEndpoints: () => Promise<string[]>;
};

export const hostConnectionPoolStateKeys: (keyof HostConnectionPoolState<any>)[] = [
  'hostGetNextConnectedEndpoint',
  'hostAddToConnections',
  'hostGetFieldFromConnectionPoolItem',
  'hostSetFieldInConnectionPoolItem',
  'hostGetSuspendedEndpoints',
  'hostRemoveFromConnections',
  'hostHandleBatchApiError',
  'hostHandleBatchApiSuccess',
  'hostGetDisconnectedEndpoints',
];

export function connectionPoolStateHostFunctions<T extends IApiConnectionSpecific>(
  connectionPoolState: ConnectionPoolStateManager<T>
): HostConnectionPoolState<T> {
  return {
    hostAddToConnections: connectionPoolState.addToConnections.bind(connectionPoolState),
    hostGetNextConnectedEndpoint: connectionPoolState.getNextConnectedEndpoint.bind(connectionPoolState),
    hostGetFieldFromConnectionPoolItem: connectionPoolState.getFieldValue.bind(connectionPoolState),
    hostSetFieldInConnectionPoolItem: connectionPoolState.setFieldValue.bind(connectionPoolState),
    hostGetSuspendedEndpoints: connectionPoolState.getSuspendedEndpoints.bind(connectionPoolState),
    hostRemoveFromConnections: connectionPoolState.removeFromConnections.bind(connectionPoolState),
    hostHandleBatchApiError: connectionPoolState.handleBatchApiError.bind(connectionPoolState),
    hostHandleBatchApiSuccess: connectionPoolState.handleBatchApiSuccess.bind(connectionPoolState),
    hostGetDisconnectedEndpoints: connectionPoolState.getDisconnectedEndpoints.bind(connectionPoolState),
  };
}

@Injectable()
export class WorkerConnectionPoolStateManager<T extends IApiConnectionSpecific>
  implements IConnectionPoolStateManager<T>
{
  constructor(private host: HostConnectionPoolState<any>) {
    if (isMainThread) {
      throw new Error('Expected to be worker thread');
    }
  }

  async getNextConnectedEndpoint(): Promise<string | undefined> {
    return this.host.hostGetNextConnectedEndpoint();
  }

  async addToConnections(endpoint: string, primary = false): Promise<void> {
    return this.host.hostAddToConnections(endpoint, primary);
  }

  async getFieldValue<K extends keyof ConnectionPoolItem<T>>(
    endpoint: string,
    field: K
  ): Promise<ConnectionPoolItem<T>[K]> {
    return this.host.hostGetFieldFromConnectionPoolItem(endpoint, field);
  }

  async setFieldValue<K extends keyof ConnectionPoolItem<T>>(
    endpoint: string,
    field: K,
    value: ConnectionPoolItem<T>[K]
  ): Promise<void> {
    return this.host.hostSetFieldInConnectionPoolItem(endpoint, field, value);
  }

  async getSuspendedEndpoints(): Promise<string[]> {
    return this.host.hostGetSuspendedEndpoints();
  }

  async removeFromConnections(endpoint: string): Promise<void> {
    return this.host.hostRemoveFromConnections(endpoint);
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async handleApiError(endpoint: string, errorType: ApiErrorType): Promise<void> {
    throw new Error(`Not Implemented`); // workers use handleBatchApiError
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async handleApiSuccess(endpoint: string, responseTime: number): Promise<void> {
    throw new Error(`Not Implemented`); // workers use handleBatchApiSuccess
  }

  async handleBatchApiSuccess(successResults: Array<{endpoint: string; responseTime: number}>): Promise<void> {
    return this.host.hostHandleBatchApiSuccess(successResults);
  }

  async handleBatchApiError(errorResults: Array<{endpoint: string; errorType: ApiErrorType}>): Promise<void> {
    return this.host.hostHandleBatchApiError(errorResults);
  }

  async getDisconnectedEndpoints(): Promise<string[]> {
    return this.host.hostGetDisconnectedEndpoints();
  }
}
