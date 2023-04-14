// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export abstract class IndexerManager {
  abstract start(): Promise<void>;
  abstract indexBlock(
    block: any,
    ...args: any[]
  ): Promise<{dynamicDsCreated: boolean; operationHash: Uint8Array; reindexBlockHeight: number}>;
}
