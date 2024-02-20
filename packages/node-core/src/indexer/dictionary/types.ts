// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IBlock} from '@subql/types-core';
import {BlockHeightMap} from '../../utils/blockHeightMap';

export type DictionaryResponse<B = number> = {
  batchBlocks: B[];
  lastBufferedHeight: number;
};

export interface IDictionary<DS, FB> {
  metadataValid: boolean | undefined;
  getData(
    startBlock: number,
    queryEndBlock: number,
    limit: number
  ): Promise<DictionaryResponse<IBlock<FB> | number> | undefined>;
  init(): Promise<void>;
  queryMapValidByHeight(height: number): boolean;
  getQueryEndBlock(startHeight: number, apiFinalizedHeight: number): number;
  startHeight: number;
  heightValidation(height: number): boolean;
  updateQueriesMap(dataSources: BlockHeightMap<DS[]>): void;
}

export interface IDictionaryCtrl<DS, FB> {
  initDictionaries(): void;
  useDictionary(height: number): boolean;
  buildDictionaryEntryMap(dataSources: BlockHeightMap<DS[]>): void;
  scopedDictionaryEntries(
    startBlockHeight: number,
    queryEndBlock: number,
    scaledBatchSize: number
  ): Promise<(DictionaryResponse<number | IBlock<FB>> & {queryEndBlock: number}) | undefined>;
}
