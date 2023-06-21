// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { IApi, NetworkMetadataPayload } from '@subql/node-core';
import { BlockContent } from '../types';

export type HostApiService = {
  hostApi: () => Promise<ApiPromise>;
  hostFetchBlocks: (
    blocks: number[],
    overallSpecVer: number,
  ) => Promise<BlockContent[]>;
};

export const hostApiServiceKeys: (keyof HostApiService)[] = [
  'hostApi',
  'hostFetchBlocks',
];

@Injectable()
export class WorkerApiService implements IApi {
  constructor(private host: HostApiService) {}

  get api(): Promise<ApiPromise> {
    return this.host.hostApi();
  }

  async fetchBlocks(
    blocks: number[],
    overallSpecVer: number,
  ): Promise<BlockContent[]> {
    return this.host.hostFetchBlocks(blocks, overallSpecVer);
  }

  safeApi(height: number) {
    throw new Error(`unimplemented`);
  }
  unsafeApi: any;
  networkMeta: NetworkMetadataPayload;
}
