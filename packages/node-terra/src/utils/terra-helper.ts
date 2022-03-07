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
    let filteredEvent = {};
    filters.forEach((filter) => {
      if (
        filter.contract &&
        event.txData[0]['@type'] === '/terra.wasm.v1beta1.MsgExecuteContract' &&
        event.txData[0].contract === filter.contract
      ) {
        filteredEvent = filterEventTypes(event, filter);
      } else if (!filter.contract) {
        filteredEvent = filterEventTypes(event, filter);
      }
    });
    //console.log(filteredEvent)
    if (Object.keys(filteredEvent).length !== 0) {
      filteredEvents.push(filteredEvent);
    }
  });
  console.log(filteredEvents);
  return filteredEvents;
}

export function filterEventTypes(
  event: TerraEvent,
  filter: SubqlTerraEventFilter,
): TerraEvent | undefined {
  const filteredTypes = [];
  event.event.forEach((e) => {
    const toPush = {};
    if (filter.type in e) {
      toPush[filter.type] = e[filter.type];
      filteredTypes.push(toPush);
    }
  });
  const filteredEvent = event;
  filteredEvent.event = filteredTypes;
  return filteredEvent;
}

export function filterCall(
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
  const filteredCalls: TerraCall[] = [];
  calls.forEach((call) => {
    filters.forEach((filter) => {
      if (
        filter.contract === call.to &&
        !!(filter.from === call.from) &&
        !!(filter.function in call.data.execute_msg)
      ) {
        filteredCalls.push(call);
      }
    });
  });
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

export async function getEventsByTypeFromBlock(
  api: LCDClient,
  blockInfo: BlockInfo,
): Promise<TerraEvent[]> {
  const txHashes = blockInfo.block.data.txs;
  if (txHashes.length === 0) {
    return [];
  }
  const txInfos = await getTxInfobyHashes(api, txHashes);
  return txInfos.map((txInfo) => {
    const txLogs = txInfo.logs;
    const events = txLogs.map((txLog) => txLog.eventsByType);
    return <TerraEvent>{
      event: events,
      txData: txInfo.tx.body.messages.map((msg) => msg.toData()),
      blockNumber: +blockInfo.block.header.height,
      blockHash: blockInfo.block_id.hash,
      timestamp: txInfo.timestamp,
      transactionHash: txInfo.txhash,
    };
  });
  /*
  const txLogs = txInfos.map((txInfo) => txInfo.logs);
  const txLogsFlat = ([] as TxLog[]).concat(...txLogs);
  const events = txLogsFlat.map((txLog) => txLog.eventsByType);
  return events;
  */
}

export async function getContractExecutionTxInfos(
  api: LCDClient,
  blockInfo: BlockInfo,
): Promise<TxInfo[]> {
  const txHashes = blockInfo.block.data.txs;
  if (txHashes.length === 0) {
    return [];
  }
  const txInfos = await getTxInfobyHashes(api, txHashes);
  return txInfos.filter((txInfo) => {
    let executionFound = false;
    for (const msg of txInfo.tx.body.messages) {
      if (msg['@type'] === '/terra.wasm.v1beta1.MsgExecuteContract') {
        executionFound = true;
        break;
      }
    }
    return executionFound;
  });
}

export function wrapBlock(blockInfo: BlockInfo): TerraBlock {
  return {
    block: blockInfo,
  };
}

export function wrapCall(txInfos: TxInfo[], blockInfo: BlockInfo): TerraCall[] {
  return txInfos.map((txInfo) => {
    const msg = txInfo.tx.body.messages[0] as MsgExecuteContract;
    return <TerraCall>{
      from: msg.toData().sender,
      to: msg.toData().contract,
      fee: txInfo.tx.auth_info.fee.toData(),
      data: msg.toData(),
      hash: txInfo.txhash,
      blockNumber: +blockInfo.block.header.height,
      blockHash: hashToHex(blockInfo.block_id.hash),
      timestamp: txInfo.timestamp,
      signatures: txInfo.tx.signatures,
    };
  });
}

export async function fetchTerraBlocksBatches(
  api: LCDClient,
  blockArray: number[],
): Promise<TerraBlockContent[]> {
  const blocks = await fetchTerraBlocksArray(api, blockArray);
  return Promise.all(
    blocks.map(async (blockInfo) => {
      const e = await getEventsByTypeFromBlock(api, blockInfo);
      const txInfos = await getContractExecutionTxInfos(api, blockInfo);
      return <TerraBlockContent>{
        block: wrapBlock(blockInfo),
        events: e,
        call: wrapCall(txInfos, blockInfo),
      };
    }),
  );
}
