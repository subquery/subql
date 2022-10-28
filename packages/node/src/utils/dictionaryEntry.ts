// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Text } from '@polkadot/types-codec';
import {
  isRuntimeDataSourceV0_2_0,
  isRuntimeDataSourceV0_3_0,
  RuntimeDataSourceV0_0_1,
} from '@subql/common-substrate';
import { Dictionary } from '@subql/node-core';
import { DictionaryQueryEntry } from '@subql/types';
import { SubqlProjectDs } from '../configure/SubqueryProject';

export function buildDictionaryEntryMap(
  dataSources: SubqlProjectDs[],
  templateDynamicDatasouces: SubqlProjectDs[],
  runtimeVersionSpecName: Text,
  getDictionaryQueryEntries: (startBlock: number) => DictionaryQueryEntry[],
): Map<number, DictionaryQueryEntry[]> {
  const mappedDictionaryQueryEntries = new Map();

  const sanitizedDs = dataSources.filter(
    (ds) =>
      isRuntimeDataSourceV0_3_0(ds) ||
      isRuntimeDataSourceV0_2_0(ds) ||
      !(ds as RuntimeDataSourceV0_0_1).filter?.specName ||
      (ds as RuntimeDataSourceV0_0_1).filter.specName ===
        runtimeVersionSpecName.toString(),
  );

  for (const ds of sanitizedDs.concat(templateDynamicDatasouces)) {
    mappedDictionaryQueryEntries.set(
      ds.startBlock,
      getDictionaryQueryEntries(ds.startBlock),
    );
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
    conditions: DictionaryQueryEntry[],
  ) => Promise<Dictionary>,
): Promise<Dictionary> {
  const dictionaryQueryEntries = setDictionaryQueryEntries(
    startBlockHeight,
    queryEndBlock,
    endBlockHeight,
    mappedDictionaryQueryEntries,
  );
  console.log('Current dictQuery: ', dictionaryQueryEntries);

  return getDictionary(
    startBlockHeight,
    queryEndBlock,
    scaledBatchSize,
    dictionaryQueryEntries,
  );
}

export function setDictionaryQueryEntries(
  startBlock: number,
  queryEndBlock: number,
  endBlockHeight: number,
  mappedDictionaryQueryEntries: Map<number, DictionaryQueryEntry[]>,
): DictionaryQueryEntry[] {
  let dictionaryQueryEntries: DictionaryQueryEntry[] = [];

  let currKey: number;

  mappedDictionaryQueryEntries.forEach((value, key, map) => {
    /*
    the logic for this wrong

    e.g. keys 1,100,200
    startBlock when using key_1 could be 99 and its endBlock could be 150
    hence, skipping key_2 filters for those 50 blocks
    should be using endBlock instead

    if endBlock is greater or equal to key then implement key_2 query
     */
    if (endBlockHeight >= key) {
      // if(value.length > 0) {
      //   console.log('using dictQuery:',  value)
      dictionaryQueryEntries = value;
      currKey = key;
      // }
    }
  });

  console.log('output dictQuery: ', dictionaryQueryEntries);
  console.log(`current dictKey: ${currKey} at startBlock: ${startBlock}`);
  console.log('endBlock: ', endBlockHeight);
  return dictionaryQueryEntries;
}
