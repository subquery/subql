// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { profiler } from '@subql/node-core';
import { ApiService } from '../api.service';
import {
  DictionaryService,
  SpecVersionDictionary,
} from '../dictionary.service';
import {
  BaseRuntimeService,
  SPEC_VERSION_BLOCK_GAP,
} from './base-runtime.service';

@Injectable()
export class RuntimeService
  extends BaseRuntimeService
  implements OnApplicationShutdown
{
  private isShutdown = false;
  protected useDictionary: boolean;

  constructor(
    protected apiService: ApiService,
    protected dictionaryService?: DictionaryService,
  ) {
    super(apiService);
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  // get latest specVersions from dictionary
  async syncDictionarySpecVersions(): Promise<void> {
    const response = this.useDictionary
      ? await this.dictionaryService.getSpecVersions()
      : undefined;
    if (response !== undefined) {
      this.specVersionMap = response;
    }
  }

  setSpecVersionMap(raw: SpecVersionDictionary | undefined): void {
    if (raw === undefined) {
      this.specVersionMap = [];
    }
    this.specVersionMap = this.dictionaryService.parseSpecVersions(raw);
  }

  // main runtime responsible for sync from dictionary
  async getSpecVersion(
    blockHeight: number,
  ): Promise<{ blockSpecVersion: number; syncedDictionary: boolean }> {
    let blockSpecVersion: number;
    let syncedDictionary = false;
    // we want to keep the specVersionMap in memory, and use it even useDictionary been disabled
    // therefore instead of check .useDictionary, we check it length before use it.
    if (this.specVersionMap && this.specVersionMap.length !== 0) {
      blockSpecVersion = this.getSpecFromMap(blockHeight, this.specVersionMap);
    }
    if (blockSpecVersion === undefined) {
      blockSpecVersion = await this.getSpecFromApi(blockHeight);
      if (blockHeight + SPEC_VERSION_BLOCK_GAP < this.latestFinalizedHeight) {
        // Ask to sync local specVersionMap with dictionary
        await this.syncDictionarySpecVersions();
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
