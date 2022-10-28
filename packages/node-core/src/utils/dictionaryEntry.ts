// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Text} from '@polkadot/types-codec';
import {DictionaryQueryEntry} from '@subql/types';
import {Dictionary} from '../indexer/dictionary.service';
// import { SubqlProjectDs } from '../../../node/src/configure/SubqueryProject';

export function buildDictionaryEntryMap(
  // unsure how to make this more generic
  dataSources: any[],
  templateDynamicDatasouces: any[],
  runtimeVersionSpecName: Text,
  getDictionaryQueryEntries: (startBlock: number) => DictionaryQueryEntry[]
): Map<number, DictionaryQueryEntry[]> {
  const mappedDictionaryQueryEntries = new Map();

  for (const ds of dataSources.concat(templateDynamicDatasouces)) {
    mappedDictionaryQueryEntries.set(ds.startBlock, getDictionaryQueryEntries(ds.startBlock));
  }
  return mappedDictionaryQueryEntries;
}

export async function scopedDictionaryEntries(
  startBlockHeight: number,
  endBlockHeight: number,
  queryEndBlock: number,
  scaledBatchSize: number,
  mappedDictionaryQueryEntries: Map<number, DictionaryQueryEntry[]>,
  getDictionary: (
    startBlock: number,
    queryEndBlock: number,
    batchSize: number,
    conditions: DictionaryQueryEntry[]
  ) => Promise<Dictionary>
): Promise<Dictionary> {
  const dictionaryQueryEntries = setDictionaryQueryEntries(
    startBlockHeight,
    queryEndBlock,
    endBlockHeight,
    mappedDictionaryQueryEntries
  );

  return getDictionary(startBlockHeight, queryEndBlock, scaledBatchSize, dictionaryQueryEntries);
}

export function setDictionaryQueryEntries(
  startBlock: number,
  queryEndBlock: number,
  endBlockHeight: number,
  mappedDictionaryQueryEntries: Map<number, DictionaryQueryEntry[]>
): DictionaryQueryEntry[] {
  let dictionaryQueryEntries: DictionaryQueryEntry[];

  mappedDictionaryQueryEntries.forEach((value, key, map) => {
    if (endBlockHeight >= key) {
      dictionaryQueryEntries = value;
    }
  });

  if (dictionaryQueryEntries === undefined) {
    throw Error('Could not set dictionaryQueryEntries');
  }

  return dictionaryQueryEntries;
}
