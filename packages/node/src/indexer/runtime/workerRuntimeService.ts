// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import { SpecVersion } from '../dictionary';
import { BaseRuntimeService } from './base-runtime.service';

@Injectable()
export class WorkerRuntimeService extends BaseRuntimeService {
  // sync specVersion between main and workers
  syncSpecVersionMap(
    specVersionMap: SpecVersion[],
    latestFinalizedHeight?: number,
  ): void {
    this.specVersionMap = specVersionMap;
    if (
      latestFinalizedHeight !== undefined &&
      this.latestFinalizedHeight &&
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
    let blockSpecVersion: number | undefined;
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
}
