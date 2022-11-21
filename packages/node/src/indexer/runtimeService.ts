// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { OnApplicationShutdown } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { profiler } from '@subql/node-core';
import { SubstrateBlock } from '@subql/types';
import * as SubstrateUtil from '../utils/substrate';
import { yargsOptions } from '../yargs';
import { ApiService } from './api.service';
import {
  DictionaryService,
  SpecVersion,
  SpecVersionDictionary,
} from './dictionary.service';
const SPEC_VERSION_BLOCK_GAP = 100;
type GetUseDictionary = () => boolean;
type GetLatestFinalizedHeight = () => number;
type GetSpecVersions = () => Promise<SpecVersion[]>;

export class RuntimeService implements OnApplicationShutdown {
  // private specVersionChanged: SpecVersionChanged;
  parentSpecVersion: number;
  protected specVersionMap: SpecVersion[];
  protected currentRuntimeVersion: RuntimeVersion;
  private isShutdown = false;
  private useDictionary: boolean;
  private latestFinalizedHeight: number;
  private api: ApiPromise;
  private getSpecVersions: GetSpecVersions;

  init(
    getUseDictionary: GetUseDictionary,
    getLatestFinalizedHeight: GetLatestFinalizedHeight,
    api: ApiPromise,
    getSpecVersions: GetSpecVersions,
  ): void {
    this.useDictionary = getUseDictionary();
    this.latestFinalizedHeight = getLatestFinalizedHeight();
    this.api = api;
    this.getSpecVersions = getSpecVersions;
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  setSpecVersionMap(raw: SpecVersionDictionary | undefined) {
    if (raw === undefined) {
      this.specVersionMap = [];
    }
    this.specVersionMap = this.parseSpecVersions(raw);
  }

  parseSpecVersions(raw: SpecVersionDictionary): SpecVersion[] {
    if (raw === undefined) {
      return [];
    }
    const specVersionBlockHeightSet = new Set<SpecVersion>();
    const specVersions = (raw.specVersions as any).nodes;
    const _metadata = raw._metadata;

    // Add range for -1 specVersions
    for (let i = 0; i < specVersions.length - 1; i++) {
      specVersionBlockHeightSet.add({
        id: specVersions[i].id,
        start: Number(specVersions[i].blockHeight),
        end: Number(specVersions[i + 1].blockHeight) - 1,
      });
    }
    if (specVersions && specVersions.length >= 0) {
      // Add range for the last specVersion
      if (_metadata.lastProcessedHeight) {
        specVersionBlockHeightSet.add({
          id: specVersions[specVersions.length - 1].id,
          start: Number(specVersions[specVersions.length - 1].blockHeight),
          end: Number(_metadata.lastProcessedHeight),
        });
      }
    }
    return Array.from(specVersionBlockHeightSet);
  }

  @profiler(yargsOptions.argv.profiler)
  async prefetchMeta(height: number): Promise<void> {
    const blockHash = await this.api.rpc.chain.getBlockHash(height);
    if (
      this.parentSpecVersion &&
      this.specVersionMap &&
      this.specVersionMap.length !== 0
    ) {
      const parentSpecVersion = this.specVersionMap.find(
        (spec) => Number(spec.id) === this.parentSpecVersion,
      );
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
    } else {
      await SubstrateUtil.prefetchMetadata(this.api, blockHash);
    }
  }

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
  //
  syncRuntimeWithFetch(useDictionary: boolean, latestFinalizedHeight: number) {
    this.useDictionary = useDictionary;
    this.latestFinalizedHeight = latestFinalizedHeight;
  }

  async getSpecVersion(blockHeight: number): Promise<number> {
    let currentSpecVersion: number;
    // we want to keep the specVersionMap in memory, and use it even useDictionary been disabled
    // therefore instead of check .useDictionary, we check it length before use it.
    if (this.specVersionMap && this.specVersionMap.length !== 0) {
      currentSpecVersion = this.getSpecFromMap(
        blockHeight,
        this.specVersionMap,
      );
    }
    if (currentSpecVersion === undefined) {
      currentSpecVersion = await this.getSpecFromApi(blockHeight);
      // Assume dictionary is synced
      if (blockHeight + SPEC_VERSION_BLOCK_GAP < this.latestFinalizedHeight) {
        const response = this.useDictionary
          ? await this.getSpecVersions()
          : undefined;
        if (response !== undefined) {
          this.specVersionMap = response;
        }
      }
    }
    return currentSpecVersion;
  }

  async getSpecFromApi(height: number): Promise<number> {
    const parentBlockHash = await this.api.rpc.chain.getBlockHash(
      Math.max(height - 1, 0),
    );
    const runtimeVersion = await this.api.rpc.state.getRuntimeVersion(
      parentBlockHash,
    );
    const specVersion = runtimeVersion.specVersion.toNumber();
    return specVersion;
  }

  async getRuntimeVersion(block: SubstrateBlock): Promise<RuntimeVersion> {
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

  @profiler(yargsOptions.argv.profiler)
  async specChanged(height: number): Promise<boolean> {
    const specVersion = await this.getSpecVersion(height);
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
