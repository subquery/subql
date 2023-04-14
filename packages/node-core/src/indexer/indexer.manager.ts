// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export abstract class IndexerManager<B, DS> {
  abstract start(): Promise<void>;
  abstract indexBlock(
    block: B,
    datasources: DS[],
    ...args: any[]
  ): Promise<{dynamicDsCreated: boolean; operationHash: Uint8Array; reindexBlockHeight: number}>;
}
