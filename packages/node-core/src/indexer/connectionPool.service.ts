// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable, OnApplicationShutdown} from '@nestjs/common';
import {toNumber} from 'lodash';
import {getLogger} from '../logger';

const logger = getLogger('api');

export interface ApiConnection {
  apiConnect(): Promise<void>;
  apiDisconnect(): Promise<void>;
}

@Injectable()
export class ConnectionPoolService<T extends ApiConnection> implements OnApplicationShutdown {
  private allApi: T[] = [];
  private connectionPool: Record<number, T> = {};
  private taskCounter = 0;

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      Object.keys(this.connectionPool)?.map((key) => this.connectionPool[toNumber(key)].apiDisconnect())
    );
  }

  addToConnections(api: T): void {
    this.allApi.push(api);
    this.connectionPool[this.allApi.length - 1] = api;
  }

  addBatchToConnections(apis: T[]): void {
    apis.forEach((api) => this.addToConnections(api));
  }

  async connectToApi(apiIndex: number): Promise<void> {
    await this.allApi[apiIndex].apiConnect();
  }

  get api(): T {
    const index = this.getNextConnectedApiIndex();
    if (index === -1) {
      throw new Error('No connected api');
    }
    return this.connectionPool[index];
  }

  getNextConnectedApiIndex(): number {
    if (Object.keys(this.connectionPool).length === 0) {
      return -1;
    }
    const nextIndex = this.taskCounter % Object.keys(this.connectionPool).length;
    this.taskCounter++;
    return toNumber(Object.keys(this.connectionPool)[nextIndex]);
  }

  get numConnections(): number {
    return Object.keys(this.connectionPool).length;
  }

  async handleApiDisconnects(apiIndex: number, endpoint: string): Promise<void> {
    logger.warn(`disconnected from ${endpoint}`);
    delete this.connectionPool[apiIndex];

    logger.debug(`reconnecting to ${endpoint}...`);
    await this.connectToApi(apiIndex);

    logger.info(`reconnected to ${endpoint}!`);
    this.connectionPool[apiIndex] = this.allApi[apiIndex];
  }
}
