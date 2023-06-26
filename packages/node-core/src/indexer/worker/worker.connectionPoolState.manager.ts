// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable} from '@nestjs/common';
import {ApiConnectionError, ApiErrorType} from '../connectionPool.service';

export type HostConnectionPoolState<T> = {
  hostGetNextConnectedApiIndex: () => Promise<number | undefined>;
  hostAddToConnections: (endpoint: string, index: number) => Promise<void>;
  hostGetFieldFromConnectionPoolItem: <K extends keyof T>(index: number, field: K) => Promise<T[K]>;
  hostSetFieldInConnectionPoolItem: <K extends keyof T>(index: number, field: K, value: T[K]) => Promise<void>;
  hostSetTimeoutIdInConnectionPoolItem: (index: number, delay: number) => Promise<void>;
  hostClearTimeoutIdInConnectionPoolItem: (index: number) => Promise<void>;
  hostGetSuspendedIndices: () => Promise<number[]>;
  hostDeleteFromPool: (index: number) => Promise<void>;
  hostHandleApiError: (index: number, errorType: string) => Promise<void>;
  hostHandleApiSuccess: (index: number, responseTime: number) => Promise<void>;
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
  'hostGetDisconnectedIndices',
  'hostShutdownPoolState',
];

@Injectable()
export class WorkerConnectionPoolStateManager<T> {
  constructor(private host: HostConnectionPoolState<any>) {}

  async getNextConnectedApiIndex(): Promise<number | undefined> {
    return this.host.hostGetNextConnectedApiIndex();
  }

  async addToConnections(endpoint: string, index: number): Promise<void> {
    return this.host.hostAddToConnections(endpoint, index);
  }

  async getFieldValue<K extends keyof T>(index: number, field: K): Promise<T[K]> {
    return this.host.hostGetFieldFromConnectionPoolItem(index, field);
  }

  async setFieldValue<K extends keyof T>(index: number, field: K, value: T[K]): Promise<void> {
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

  async getDisconnectedIndices(): Promise<number[]> {
    return this.host.hostGetDisconnectedIndices();
  }

  async shutdown(): Promise<void> {
    return this.host.hostShutdownPoolState();
  }
}
