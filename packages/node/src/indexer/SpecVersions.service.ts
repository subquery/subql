// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { BlockHash, RuntimeVersion } from '@polkadot/types/interfaces';

export type SpecVersionMap = { [blockNumber: number]: number }; // blockNumber => specVersion

export function getSpecVersionBlockNumbers(
  specVersions: SpecVersionMap,
): number[] {
  return Object.keys(specVersions).map((key) => parseInt(key, 10));
}

@Injectable()
export class SpecVersionService {
  private _specVersions: SpecVersionMap;

  private _runtimeVersions: { [specVersion: number]: RuntimeVersion };
  private _lastQueriedHeight = 0; // Keep track of the latest know block spec version

  constructor() {
    this._specVersions = {};
    this._runtimeVersions = {};
  }

  addSpecVersions(
    specVersions: SpecVersionMap,
    lastQueriedHeight?: number,
  ): void {
    this._specVersions = { ...this.specVersions, ...specVersions };
    this._lastQueriedHeight =
      lastQueriedHeight ??
      Math.max(...getSpecVersionBlockNumbers(specVersions));
  }

  get specVersions(): SpecVersionMap {
    return this._specVersions;
  }

  get lastQueriedHeight(): number {
    return this._lastQueriedHeight;
  }

  async getRuntimeVersion(
    api: ApiPromise,
    blockNumber: number,
    blockHash: string | BlockHash,
  ): Promise<RuntimeVersion | undefined> {
    const specVersion = this.getSpecVersion(blockNumber);
    if (!this._runtimeVersions[specVersion]) {
      this._runtimeVersions[specVersion] =
        await api.rpc.state.getRuntimeVersion(blockHash);
    }

    return this._runtimeVersions[specVersion];
  }

  getSpecVersion(blockNumber: number): number | undefined {
    const specVersionBlock = Math.max(
      ...getSpecVersionBlockNumbers(this.specVersions).filter(
        (key) => key <= blockNumber,
      ),
    );

    return this.specVersions[specVersionBlock];
  }
}
