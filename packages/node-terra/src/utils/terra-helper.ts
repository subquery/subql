// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlTerraEventFilter,
  TerraBlock,
  TerraEvent,
  TerraCall,
} from '@subql/types-terra';
import {
  BlockInfo,
  EventsByType,
  hashToHex,
  LCDClient,
  TxInfo,
  TxLog,
  Tx,
  MsgExecuteContract,
} from '@terra-money/terra.js';
import { TerraBlockContent } from '../indexer/types';
import { getLogger } from './logger';

const logger = getLogger('fetch');

export function filterEvents(
  events: TerraEvent[],
  filterOrFilters?: SubqlTerraEventFilter | SubqlTerraEventFilter[] | undefined,
): TerraEvent[] {
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
      if (filter.type in event.event) {
        fe[filter.type] = event.event[filter.type];
      }
    });
    if (Object.keys(fe).length !== 0) {
      filteredEvents.push(fe);
    }
  });
  console.log(filteredEvents);
  return filteredEvents;
}

async function getBlockByHeight(api: LCDClient, height: number) {
  return api.tendermint.blockInfo(height).catch((e) => {
    logger.error(`failed to fetch Block ${height}`);
    throw e;
  });
}

export async function fetchTerraBlocksArray(
  api: LCDClient,
  blockArray: number[],
): Promise<BlockInfo[]> {
  return Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
}

export async function getTxInfobyHashes(
  api: LCDClient,
  txHashes: string[],
): Promise<TxInfo[]> {
  return Promise.all(
    txHashes.map(async (hash) => {
      return api.tx.txInfo(hashToHex(hash));
    }),
  );
}

export async function getTerraEvents(
  api: LCDClient,
  blockInfo: BlockInfo,
): Promise<TerraEvent[]> {
  const txHashes = blockInfo.block.data.txs;
  if (txHashes.length === 0) {
    return [];
  }
  const txInfos = await getTxInfobyHashes(api, txHashes);
  const eventInfos: TerraEvent[] = [];
  for (const ti of txInfos) {
    const txLogs = ti.logs;
    for (const log of txLogs) {
      const eventInfo: TerraEvent = {
        event: log.eventsByType,
        block: blockInfo,
        txInfo: ti,
        log: log,
      };
      eventInfos.push(eventInfo);
    }
  }
  return eventInfos;
}

export async function getContractExecutionTxInfos(
  api: LCDClient,
  blockInfo: BlockInfo,
): Promise<TerraCall[]> {
  const txHashes = blockInfo.block.data.txs;
  if (txHashes.length === 0) {
    return [];
  }
  const txInfos = await getTxInfobyHashes(api, txHashes);
  const callInfos: TerraCall[] = [];
  for (const txInfo of txInfos) {
    for (const msg of txInfo.tx.body.messages) {
      if (msg.toData()['@type'] === '/terra.wasm.v1beta1.MsgExecuteContract') {
        const callInfo: TerraCall = {
          data: msg.toData() as MsgExecuteContract.Data,
          tx: txInfo,
          block: blockInfo,
        };
        callInfos.push(callInfo);
      }
    }
  }
  return callInfos;
  //return txInfos.filter((txInfo)=> (
  //  !!(txInfo.tx.body.messages[0]["@type"] === "/terra.wasm.v1beta1.MsgExecuteContract")
  //))
}

export function wrapBlock(blockInfo: BlockInfo): TerraBlock {
  return {
    block: blockInfo,
  };
}

export function wrapEvent(
  blockInfo: BlockInfo,
  events: EventsByType[],
): TerraEvent[] {
  return events.map(
    (event) =>
      <TerraEvent>{
        block: blockInfo,
        event: event,
      },
  );
}

export function wrapCall(txInfos: TxInfo[], blockInfo: BlockInfo): TerraCall[] {
  return txInfos.map(
    (txInfo) =>
      <TerraCall>{
        data: txInfo.tx.body.messages[0].toData() as MsgExecuteContract.Data,
        tx: txInfo,
        block: blockInfo,
        events: txInfo.logs.map((log) => log.eventsByType),
      },
  );
}

export async function fetchTerraBlocksBatches(
  api: LCDClient,
  blockArray: number[],
): Promise<TerraBlockContent[]> {
  const blocks = await fetchTerraBlocksArray(api, blockArray);
  return Promise.all(
    blocks.map(async (blockInfo) => {
      const e = await getTerraEvents(api, blockInfo);
      const callInfos = await getContractExecutionTxInfos(api, blockInfo);
      return <TerraBlockContent>{
        block: wrapBlock(blockInfo),
        events: e,
        call: callInfos,
      };
    }),
  );
}
