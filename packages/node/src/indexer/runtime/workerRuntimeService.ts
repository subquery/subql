// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { SpecVersion } from '../dictionary.service';
import {
  BaseRuntimeService,
  SPEC_VERSION_BLOCK_GAP,
} from './base-runtime.service';

@Injectable()
export class WorkerRuntimeService
  extends BaseRuntimeService
  implements OnApplicationShutdown
{
  private isShutdown = false;

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  // sync specVersion between main and workers
  syncSpecVersionMap(
    specVersionMap: SpecVersion[],
    latestFinalizedHeight?: number,
  ): void {
    this.specVersionMap = specVersionMap;
    if (
      latestFinalizedHeight !== undefined ||
      this.latestFinalizedHeight < latestFinalizedHeight
    ) {
      this.latestFinalizedHeight = latestFinalizedHeight;
    }
  }

  // Worker runtime does not syncDictionary by its self
  // syncDictionary is done by main runtime
  async getSpecVersion(
    blockHeight: number,
  ): Promise<{ blockSpecVersion: number; syncedDictionary: boolean }> {
    let blockSpecVersion: number;
    // we want to keep the specVersionMap in memory, and use it even useDictionary been disabled
    // therefore instead of check .useDictionary, we check it length before use it.
    if (this.specVersionMap && this.specVersionMap.length !== 0) {
      blockSpecVersion = this.getSpecFromMap(blockHeight, this.specVersionMap);
    }
    if (blockSpecVersion === undefined) {
      blockSpecVersion = await this.getSpecFromApi(blockHeight);
    }
    return { blockSpecVersion, syncedDictionary: false };
  }

  // Worker always know specVersion, which fetched from main runtime
  async specChanged(height: number, specVersion: number): Promise<boolean> {
    if (this.parentSpecVersion !== specVersion) {
      const parentSpecVersionCopy = this.parentSpecVersion;
      this.parentSpecVersion = specVersion;
      await this.prefetchMeta(height);
      // When runtime init parentSpecVersion is undefined, count as unchanged,
      // so it will not use fetchRuntimeVersionRange
      return parentSpecVersionCopy === undefined ? false : true;
    }
    return false;
  }
}
