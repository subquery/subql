// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlTerraEventFilter,
  TerraBlock,
  TerraEvent,
  TerraCall,
  SubqlTerraCallFilter,
} from '@subql/types-terra';
import {
  BlockInfo,
  hashToHex,
  LCDClient,
  TxInfo,
  MsgExecuteContract,
  EventsByType,
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
    for (const filter of filters) {
      const msg = event.txInfo.tx.body.messages[event.log.msg_index].toData();
      if (
        filter.contract &&
        (msg['@type'] !== '/terra.wasm.v1beta1.MsgExecuteContract' ||
          msg.contract !== filter.contract)
      ) {
        continue;
      }
      if (!(filter.type in event.event)) {
        continue;
      }
      filteredEvents.push(event);
      break;
    }
  });
  console.log(filteredEvents);
  return filteredEvents;
}

export function filterCalls(
  calls: TerraCall[],
  filterOrFilters: SubqlTerraCallFilter | SubqlTerraCallFilter[] | undefined,
): TerraCall[] {
  if (
    !filterOrFilters ||
    (filterOrFilters instanceof Array && filterOrFilters.length === 0)
  ) {
    return calls;
  }

  const filters =
    filterOrFilters instanceof Array ? filterOrFilters : [filterOrFilters];

  const filteredCalls = [];
  for (const call of calls) {
    const callsToPush = [];
    for (const filter of filters) {
      if (filter?.from && filter.from !== call.from) {
        continue;
      }
      if (filter?.contract && filter.contract !== call.to) {
        continue;
      }
      if (!(filter?.function in call.data.execute_msg)) {
        continue;
      }
      callsToPush.push(call);
    }
    filteredCalls.push(...callsToPush);
  }
  console.log(filteredCalls);
  return filteredCalls;
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
        blockNumber: +blockInfo.block.header.height,
        blockHash: blockInfo.block_id.hash,
        blockTimestamp: ti.timestamp,
        msgIndex: log.msg_index,
        txInfo: ti,
        log: log,
        transactionHash: ti.txhash,
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
        const data = msg.toData() as MsgExecuteContract.Data;
        const callInfo: TerraCall = {
          from: data.sender,
          to: data.contract,
          fee: txInfo.tx.auth_info.fee.toData(),
          data: data,
          hash: txInfo.txhash,
          blockNumber: +blockInfo.block.header.height,
          blockHash: hashToHex(blockInfo.block_id.hash),
          timestamp: txInfo.timestamp,
          signatures: txInfo.tx.signatures,
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
        block: <TerraBlock>{
          block: blockInfo,
        },
        events: e,
        call: callInfos,
      };
    }),
  );
}
