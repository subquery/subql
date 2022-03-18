// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SubqlTerraEventFilter } from '@subql/types-terra';
import {
  BlockInfo,
  EventsByType,
  hashToHex,
  TxInfo,
  TxLog,
} from '@terra-money/terra.js';
import { TerraClient } from '../indexer/apiterra.service';
import { TerraBlockContent } from '../indexer/types';
import { getLogger } from './logger';

const logger = getLogger('fetch');

export function filterEvents(
  events: EventsByType[],
  filterOrFilters?: SubqlTerraEventFilter | SubqlTerraEventFilter[] | undefined,
): EventsByType[] {
  if (
    !filterOrFilters ||
    (filterOrFilters instanceof Array && filterOrFilters.length === 0)
  ) {
    return events;
  }

  const filters =
    filterOrFilters instanceof Array ? filterOrFilters : [filterOrFilters];
  const filteredEvents = [];
  events.forEach((event) => {
    const fe = {};
    filters.forEach((filter) => {
      if (filter.type in event) {
        fe[filter.type] = event[filter.type];
      }
    });
    if (Object.keys(fe).length !== 0) {
      filteredEvents.push(fe);
    }
  });
  console.log(filteredEvents);
  return filteredEvents;
}

async function getBlockByHeight(api: TerraClient, height: number) {
  return api.blockInfo(height).catch((e) => {
    logger.error(`failed to fetch Block ${height}`);
    throw e;
  });
}

export async function fetchTerraBlocksArray(
  api: TerraClient,
  blockArray: number[],
): Promise<BlockInfo[]> {
  return Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
}

export async function getTxInfobyHashes(
  api: TerraClient,
  txHashes: string[],
): Promise<TxInfo[]> {
  return Promise.all(
    txHashes.map(async (hash) => {
      return api.txInfo(hash);
    }),
  );
}

export async function getEventsByTypeFromBlock(
  api: TerraClient,
  blockInfo: BlockInfo,
): Promise<EventsByType[]> {
  const txHashes = blockInfo.block.data.txs;
  if (txHashes.length === 0) {
    return [];
  }
  const txInfos = await getTxInfobyHashes(api, txHashes);
  const txLogs = txInfos.map((txInfo) => txInfo.logs);
  const txLogsFlat = ([] as TxLog[]).concat(...txLogs);
  const events = txLogsFlat.map((txLog) => txLog.eventsByType);
  return events;
}

export async function fetchTerraBlocksBatches(
  api: TerraClient,
  blockArray: number[],
): Promise<TerraBlockContent[]> {
  const blocks = await fetchTerraBlocksArray(api, blockArray);
  return Promise.all(
    blocks.map(
      async (blockInfo) =>
        <TerraBlockContent>{
          block: blockInfo,
          events: await getEventsByTypeFromBlock(api, blockInfo),
        },
    ),
  );
}
