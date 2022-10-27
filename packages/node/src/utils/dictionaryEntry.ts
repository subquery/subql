// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Text } from '@polkadot/types-codec';
import {
  isCustomDs,
  isRuntimeDataSourceV0_2_0,
  isRuntimeDataSourceV0_3_0,
  RuntimeDataSourceV0_0_1,
  SubstrateBlockFilter,
  SubstrateCallFilter,
  SubstrateCustomDataSource,
  SubstrateCustomHandler,
  SubstrateDataSource,
  SubstrateDatasourceProcessor,
  SubstrateEventFilter,
  SubstrateHandler,
  SubstrateHandlerKind,
  SubstrateNetworkFilter,
  SubstrateRuntimeHandlerFilter,
} from '@subql/common-substrate';
import { Dictionary } from '@subql/node-core';
import { DictionaryQueryEntry } from '@subql/types';
import { sortBy, uniqBy } from 'lodash';
import { SubqlProjectDs } from '../configure/SubqueryProject';

/*
Should output this
{
  1000: dictionaryQueryEntries(1000),
  2000: dictionaryQueryEntries(2000),
  3000: dictionaryQueryEntries(3000)
}
following values should contain all the prior



 */

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

async function getScopedDictionaryEntries(
  startBlockHeight: number,
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
  const dictionaryQueryEntries: DictionaryQueryEntry[] = [];

  // this.mappedDictionaryQueryEntries.forEach((value, key, map) => {
  //   if (key >= startBlockHeight) {
  //     dictionaryQueryEntries.push(...value);
  //   }
  // });

  if (mappedDictionaryQueryEntries.has(queryEndBlock)) {
    dictionaryQueryEntries.push(
      ...mappedDictionaryQueryEntries.get(queryEndBlock),
    );
  }

  return getDictionary(
    startBlockHeight,
    queryEndBlock,
    scaledBatchSize,
    dictionaryQueryEntries,
  );
}

/*

{
100: Array(2)
200: Array(2) + Array(1)
300: Array(2) + Array(1) + Array(3)
}

 */

function getDictionaryQueryEntries(
  startBlock: number,
  dataSources: SubqlProjectDs[],
  templateDynamicDatasouces: SubqlProjectDs[],
  getDsProcessor: <D extends string, T extends SubstrateNetworkFilter>(
    ds: SubstrateCustomDataSource<string, T>,
  ) => SubstrateDatasourceProcessor<D, T>,
  getBaseHandlerKind: (
    ds: SubstrateDataSource,
    handler: SubstrateHandler,
  ) => SubstrateHandlerKind,
  getBaseHandlerFilters: <T extends SubstrateRuntimeHandlerFilter>(
    ds: SubstrateDataSource,
    handlerKind: string,
  ) => T[],
  getBaseHandlerKindList: (
    baseHandlerKind: SubstrateHandlerKind,
    filterList: SubstrateRuntimeHandlerFilter[],
  ) => DictionaryQueryEntry[],
): DictionaryQueryEntry[] {
  const queryEntries: DictionaryQueryEntry[] = [];

  const x = dataSources.concat(templateDynamicDatasouces);

  const filteredDs = x.filter((ds) => ds.startBlock <= startBlock);

  //  x = [ds_1, ds_2, ds_3]

  // 100: [ds_1] uuiqBy => Array(1)
  // 200: [ds_2] uuiqBy => Array(0)
  // 300: [ds_3] uuiqBy => Array(0)

  // filteredDs = [ds_1]
  // 100: [ds_1] uuiqBy => Array(1)
  // 200: [ds_1, ds_2] uuiqBy => Array(1)
  // 300: [ds_1, ds_2, ds_3] uuiqBy => Array(1)

  for (const ds of filteredDs) {
    const plugin = isCustomDs(ds) ? getDsProcessor(ds) : undefined;

    for (const handler of ds.mapping.handlers) {
      const baseHandlerKind = getBaseHandlerKind(ds, handler);
      // TODO: filterList should be dynamically typed
      let filterList: SubstrateRuntimeHandlerFilter[];
      if (isCustomDs(ds)) {
        const processor = plugin.handlerProcessors[handler.kind];

        if (processor.dictionaryQuery) {
          const queryEntry = processor.dictionaryQuery(
            (handler as SubstrateCustomHandler).filter,
            ds,
          );
          if (queryEntry) {
            queryEntries.push(queryEntry);
            continue;
          }
        }
        filterList = getBaseHandlerFilters<SubstrateRuntimeHandlerFilter>(
          ds,
          handler.kind,
        );
      } else {
        filterList = [handler.filter];
      }

      filterList = filterList.filter((f) => f);
      if (!filterList.length) return [];

      queryEntries.concat(
        ...getBaseHandlerKindList(baseHandlerKind, filterList),
      );
    }
  }
  const result = uniqBy(
    queryEntries,
    (item) =>
      `${item.entity}|${JSON.stringify(
        sortBy(item.conditions, (c) => c.field),
      )}`,
  );
  return result;
}
