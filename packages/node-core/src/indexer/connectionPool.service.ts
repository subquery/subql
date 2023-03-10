// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable, OnApplicationShutdown} from '@nestjs/common';
import {toNumber} from 'lodash';
import {getLogger} from '../logger';

const logger = getLogger('api');

export abstract class ApiConnection {
  // eslint-disable-next-line @typescript-eslint/require-await
  async apiConnect(): Promise<void> {
    throw new Error('apiConnect() is not supported');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async apiDisconnect(): Promise<void> {
    throw new Error('apiDisconnect() is not supported');
  }
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

  get firstConnectedApi(): T {
    const index = this.getFirstConnectedApiIndex();
    if (index === -1) {
      throw new Error('No connected api');
    }
    return this.connectionPool[index];
  }

  getNextConnectedApiIndex(): number {
    // get the next connected api index
    if (Object.keys(this.connectionPool).length === 0) {
      return -1;
    }
    const nextIndex = this.taskCounter % Object.keys(this.connectionPool).length;
    this.taskCounter++;
    return toNumber(Object.keys(this.connectionPool)[nextIndex]);
  }

  private getFirstConnectedApiIndex(): number {
    // get the first connected api index
    if (Object.keys(this.connectionPool).length === 0) {
      return -1;
    }
    return toNumber(Object.keys(this.connectionPool)[0]);
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
