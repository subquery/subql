// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { SubstrateBlock } from '@subql/types';
import * as SubstrateUtil from '../../utils/substrate';
import { ApiService } from '../api.service';
import { SpecVersion } from '../dictionary.service';
const SPEC_VERSION_BLOCK_GAP = 100;
type GetUseDictionary = () => boolean;
type GetLatestFinalizedHeight = () => number;

@Injectable()
export class WorkerRuntimeService implements OnApplicationShutdown {
  specVersionMap: SpecVersion[];
  protected currentRuntimeVersion: RuntimeVersion;
  private isShutdown = false;
  private useDictionary: boolean;
  latestFinalizedHeight: number;
  parentSpecVersion: number;

  constructor(private readonly apiService: ApiService) {}

  onApplicationShutdown(signal?: string) {
    throw new Error('Method not implemented.');
  }

  init(
    getUseDictionary: GetUseDictionary,
    getLatestFinalizedHeight: GetLatestFinalizedHeight,
  ): void {
    this.useDictionary = getUseDictionary();
    this.latestFinalizedHeight = getLatestFinalizedHeight();
  }

  // same as main
  get api(): ApiPromise {
    return this.apiService.getApi();
  }

  // same as main
  getSpecFromMap(
    blockHeight: number,
    specVersions: SpecVersion[],
  ): number | undefined {
    //return undefined if can not find inside range
    const spec = specVersions.find(
      (spec) => blockHeight >= spec.start && blockHeight <= spec.end,
    );
    return spec ? Number(spec.id) : undefined;
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

  private async syncDictionarySpecVersions(): Promise<void> {
    // const response = this.useDictionary
    //   ? await this.dictionaryService.getSpecVersions()
    //   : undefined;
    // if (response !== undefined) {
    //   this.specVersionMap = response;
    // }
  }

  // same as main
  async specChanged(height: number, specVersion?: number): Promise<boolean> {
    if (specVersion === undefined) {
      const { blockSpecVersion } = await this.getSpecVersion(height);
      specVersion = blockSpecVersion;
    }
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

  async getSpecFromApi(height: number): Promise<number> {
    console.log(`worker, get getSpecFromApi`);
    const parentBlockHash = await this.api.rpc.chain.getBlockHash(
      Math.max(height - 1, 0),
    );
    const runtimeVersion = await this.api.rpc.state.getRuntimeVersion(
      parentBlockHash,
    );
    const specVersion = runtimeVersion.specVersion.toNumber();
    return specVersion;
  }

  // same as main
  async prefetchMeta(height: number): Promise<void> {
    console.log(`worker, prefetchMeta`);
    if (
      this.parentSpecVersion &&
      this.specVersionMap &&
      this.specVersionMap.length !== 0
    ) {
      const parentSpecVersion = this.specVersionMap.find(
        (spec) => Number(spec.id) === this.parentSpecVersion,
      );
      if (parentSpecVersion === undefined) {
        const blockHash = await this.api.rpc.chain.getBlockHash(height);
        await SubstrateUtil.prefetchMetadata(this.api, blockHash);
      } else {
        for (const specVersion of this.specVersionMap) {
          if (
            specVersion.start > parentSpecVersion.end &&
            specVersion.start <= height
          ) {
            const blockHash = await this.api.rpc.chain.getBlockHash(
              specVersion.start,
            );
            await SubstrateUtil.prefetchMetadata(this.api, blockHash);
          }
        }
      }
    } else {
      const blockHash = await this.api.rpc.chain.getBlockHash(height);
      await SubstrateUtil.prefetchMetadata(this.api, blockHash);
    }
  }
  // same as main
  async getRuntimeVersion(block: SubstrateBlock): Promise<RuntimeVersion> {
    console.log(
      `worker, getRuntimeVersion ${block.block.header.number.toNumber()}`,
    );
    if (
      !this.currentRuntimeVersion ||
      this.currentRuntimeVersion.specVersion.toNumber() !== block.specVersion
    ) {
      this.currentRuntimeVersion = await this.api.rpc.state.getRuntimeVersion(
        block.block.header.parentHash,
      );
    }
    return this.currentRuntimeVersion;
  }
}
