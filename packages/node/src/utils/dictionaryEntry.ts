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
