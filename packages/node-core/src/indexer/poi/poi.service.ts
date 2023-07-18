// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'node:worker_threads';
import {Injectable, OnApplicationShutdown} from '@nestjs/common';
import {hexToU8a} from '@subql/utils';
import {StoreCacheService} from '../storeCache';
import {CachePoiModel} from '../storeCache/cachePoi';

const DEFAULT_PARENT_HASH = hexToU8a('0x00');

@Injectable()
export class PoiService implements OnApplicationShutdown {
  private isShutdown = false;
  private latestPoiBlockHash?: Uint8Array | null;
  private poiRepo?: CachePoiModel;

  constructor(private storeCache: StoreCacheService) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  async init(): Promise<void> {
    this.poiRepo = this.storeCache.poi ?? undefined;
    this.latestPoiBlockHash = await this.getLatestPoiBlockHash();
  }

  private async fetchPoiBlockHashFromDb(): Promise<Uint8Array | null> {
    const lastPoi = await this.poiRepo?.getLatestPoi();
    if (lastPoi === null || lastPoi === undefined) {
      return null;
    } else if (lastPoi !== null && lastPoi.hash) {
      return lastPoi.hash;
    } else {
      throw new Error(`Poi found but can not get latest hash`);
    }
  }

  async getLatestPoiBlockHash(): Promise<Uint8Array> {
    if (!this.latestPoiBlockHash || !isMainThread) {
      const poiBlockHash = await this.fetchPoiBlockHashFromDb();
      if (poiBlockHash === null || poiBlockHash === undefined) {
        this.latestPoiBlockHash = DEFAULT_PARENT_HASH;
      } else {
        this.latestPoiBlockHash = poiBlockHash;
      }
    }
    return this.latestPoiBlockHash;
  }

  setLatestPoiBlockHash(hash: Uint8Array): void {
    this.latestPoiBlockHash = hash;
  }
}
