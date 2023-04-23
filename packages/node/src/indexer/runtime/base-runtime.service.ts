// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { profiler, ApiService } from '@subql/node-core';
import { SubstrateBlock } from '@subql/types';
import * as SubstrateUtil from '../../utils/substrate';
import { yargsOptions } from '../../yargs';
import { SpecVersion } from './../dictionary.service';
export const SPEC_VERSION_BLOCK_GAP = 100;
type GetUseDictionary = () => boolean;
type GetLatestFinalizedHeight = () => number;

@Injectable()
export abstract class BaseRuntimeService {
  parentSpecVersion: number;
  specVersionMap: SpecVersion[];
  protected currentRuntimeVersion: RuntimeVersion;
  protected useDictionary: boolean;
  latestFinalizedHeight: number;

  constructor(protected apiService: ApiService) {}

  async specChanged(height: number, specVersion: number): Promise<boolean> {
    if (this.parentSpecVersion !== specVersion) {
      const parentSpecVersionCopy = this.parentSpecVersion;
      this.parentSpecVersion = specVersion;
      await this.prefetchMeta(height);
      // When runtime init parentSpecVersion is undefined, count as unchanged,
      // so it will not use fetchRuntimeVersionRange
      return parentSpecVersionCopy !== undefined;
    }
    return false;
  }

  abstract getSpecVersion(
    blockHeight: number,
  ): Promise<{ blockSpecVersion: number; syncedDictionary: boolean }>;

  init(
    getUseDictionary: GetUseDictionary,
    getLatestFinalizedHeight: GetLatestFinalizedHeight,
  ): void {
    this.useDictionary = getUseDictionary();
    this.latestFinalizedHeight = getLatestFinalizedHeight();
  }

  get api(): ApiPromise {
    return this.apiService.api;
  }

  getSpecFromMap(
    blockHeight: number,
    specVersions: SpecVersion[],
  ): number | undefined {
    //return undefined block can not find inside range
    const spec = specVersions.find(
      (spec) => blockHeight >= spec.start && blockHeight <= spec.end,
    );
    return spec ? Number(spec.id) : undefined;
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
      if (parentSpecVersion === undefined) {
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
      await SubstrateUtil.prefetchMetadata(this.api, blockHash);
    }
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
}
