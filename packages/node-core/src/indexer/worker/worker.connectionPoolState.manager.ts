// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {ConnectionPoolItem, IApiConnectionSpecific, IConnectionPoolStateManager} from '@subql/node-core';
import {ApiErrorType} from '../../api.connection.error';
import {ConnectionPoolStateManager} from '../connectionPoolState.manager';

export type HostConnectionPoolState<T> = {
  hostGetNextConnectedApiIndex: () => Promise<number | undefined>;
  hostAddToConnections: (endpoint: string, index: number, primary: boolean) => Promise<void>;
  hostGetFieldFromConnectionPoolItem: <K extends keyof ConnectionPoolItem<T>>(
    index: number,
    field: K
  ) => Promise<ConnectionPoolItem<T>[K]>;
  hostSetFieldInConnectionPoolItem: <K extends keyof ConnectionPoolItem<T>>(
    index: number,
    field: K,
    value: ConnectionPoolItem<T>[K]
  ) => Promise<void>;
  hostGetSuspendedIndices: () => Promise<number[]>;
  hostRemoveFromConnections: (index: number) => Promise<void>;
  hostHandleBatchApiSuccess(successResults: Array<{apiIndex: number; responseTime: number}>): Promise<void>;
  hostHandleBatchApiError(errorResults: Array<{apiIndex: number; errorType: ApiErrorType}>): Promise<void>;
  hostGetDisconnectedIndices: () => Promise<number[]>;
};

export const hostConnectionPoolStateKeys: (keyof HostConnectionPoolState<any>)[] = [
  'hostGetNextConnectedApiIndex',
  'hostAddToConnections',
  'hostGetFieldFromConnectionPoolItem',
  'hostSetFieldInConnectionPoolItem',
  'hostGetSuspendedIndices',
  'hostRemoveFromConnections',
  'hostHandleBatchApiError',
  'hostHandleBatchApiSuccess',
  'hostGetDisconnectedIndices',
];

export function connectionPoolStateHostFunctions<T extends IApiConnectionSpecific>(
  connectionPoolState: ConnectionPoolStateManager<T>
): HostConnectionPoolState<T> {
  return {
    hostAddToConnections: connectionPoolState.addToConnections.bind(connectionPoolState),
    hostGetNextConnectedApiIndex: connectionPoolState.getNextConnectedApiIndex.bind(connectionPoolState),
    hostGetFieldFromConnectionPoolItem: connectionPoolState.getFieldValue.bind(connectionPoolState),
    hostSetFieldInConnectionPoolItem: connectionPoolState.setFieldValue.bind(connectionPoolState),
    hostGetSuspendedIndices: connectionPoolState.getSuspendedIndices.bind(connectionPoolState),
    hostRemoveFromConnections: connectionPoolState.removeFromConnections.bind(connectionPoolState),
    hostHandleBatchApiError: connectionPoolState.handleBatchApiError.bind(connectionPoolState),
    hostHandleBatchApiSuccess: connectionPoolState.handleBatchApiSuccess.bind(connectionPoolState),
    hostGetDisconnectedIndices: connectionPoolState.getDisconnectedIndices.bind(connectionPoolState),
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

  async addToConnections(endpoint: string, index: number, primary = false): Promise<void> {
    return this.host.hostAddToConnections(endpoint, index, primary);
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

  async getSuspendedIndices(): Promise<number[]> {
    return this.host.hostGetSuspendedIndices();
  }

  async removeFromConnections(index: number): Promise<void> {
    return this.host.hostRemoveFromConnections(index);
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async handleApiError(index: number, errorType: ApiErrorType): Promise<void> {
    throw new Error(`Not Implemented`); // workers use handleBatchApiError
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async handleApiSuccess(index: number, responseTime: number): Promise<void> {
    throw new Error(`Not Implemented`); // workers use handleBatchApiSuccess
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
}
