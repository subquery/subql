// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import { getLogger, profiler } from '@subql/node-core';
import { ApiService } from '../api.service';
import { SubstrateDictionaryService } from '../dictionary';
import {
  BaseRuntimeService,
  SPEC_VERSION_BLOCK_GAP,
} from './base-runtime.service';

const logger = getLogger('RuntimeService');

@Injectable()
export class RuntimeService extends BaseRuntimeService {
  constructor(
    protected apiService: ApiService,
    protected dictionaryService?: SubstrateDictionaryService,
  ) {
    super(apiService);
  }

  // get latest specVersions from dictionary
  async syncDictionarySpecVersions(height: number): Promise<void> {
    try {
      // must check useDictionary before get SpecVersion, this will give the right dictionary to fetch SpecVersions
      const response = await this.dictionaryService?.getSpecVersions();
      if (response !== undefined) {
        this.specVersionMap = response;
      } else if (this.specVersionMap === undefined) {
        this.specVersionMap = [];
      }
    } catch (e: any) {
      logger.error(e, 'Failed to get spec versions');
    }
  }

  // main runtime responsible for sync from dictionary
  async getSpecVersion(
    blockHeight: number,
  ): Promise<{ blockSpecVersion: number; syncedDictionary: boolean }> {
    let blockSpecVersion: number | undefined;
    let syncedDictionary = false;
    // we want to keep the specVersionMap in memory, and use it even useDictionary been disabled
    // therefore instead of check .useDictionary, we check it length before use it.
    if (this.specVersionMap && this.specVersionMap.length !== 0) {
      blockSpecVersion = this.getSpecFromMap(blockHeight, this.specVersionMap);
    }
    if (blockSpecVersion === undefined) {
      blockSpecVersion = await this.getSpecFromApi(blockHeight);
      if (
        this.latestFinalizedHeight &&
        blockHeight + SPEC_VERSION_BLOCK_GAP < this.latestFinalizedHeight
      ) {
        // Ask to sync local specVersionMap with dictionary
        await this.syncDictionarySpecVersions(blockHeight);
        syncedDictionary = true;
      }
    }
    return { blockSpecVersion, syncedDictionary };
  }

  // the specVersion is always undefined
  @profiler()
  async specChanged(height: number, specVersion?: number): Promise<boolean> {
    if (specVersion === undefined) {
      const { blockSpecVersion } = await this.getSpecVersion(height);
      specVersion = blockSpecVersion;
    }
    return super.specChanged(height, specVersion);
  }
}
