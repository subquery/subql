// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TextDecoder } from 'util';
import { decodeTxRaw } from '@cosmjs/proto-signing';
import { Block, IndexedTx } from '@cosmjs/stargate';
import { Log, parseRawLog } from '@cosmjs/stargate/build/logs';
import {
  SubqlCosmosEventFilter,
  SubqlCosmosMessageFilter,
  CosmosBlock,
  CosmosEvent,
  CosmosTransaction,
  CosmosMessage,
} from '@subql/types-cosmos';
import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { CosmosClient } from '../indexer/api.service';
import { BlockContent } from '../indexer/types';
import { getLogger } from './logger';

const logger = getLogger('fetch');

export function filterMessageData(
  data: CosmosMessage,
  filter: SubqlCosmosMessageFilter,
): boolean {
  if (filter.type !== data.msg.typeUrl) {
    return false;
  }
  if (filter.values) {
    for (const key in filter.values) {
      if (!(key in data.msg) || filter.values[key] !== data.msg[key]) {
        return false;
      }
    }
  }
  if (
    filter.type === '/cosmwasm.wasm.v1.MsgExecuteContract' &&
    filter.contractCall &&
    !(filter.contractCall in data.msg.msg)
  ) {
    return false;
  }
  return true;
}

export function filterMessages(
  messages: CosmosMessage[],
  filterOrFilters?:
    | SubqlCosmosMessageFilter
    | SubqlCosmosMessageFilter[]
    | undefined,
): CosmosMessage[] {
  if (
    !filterOrFilters ||
    (filterOrFilters instanceof Array && filterOrFilters.length === 0)
  ) {
    return messages;
  }

  const filters =
    filterOrFilters instanceof Array ? filterOrFilters : [filterOrFilters];

  const filteredMessages = messages.filter((message) => {
    for (const filter of filters) {
      if (!filterMessageData(message, filter)) {
        continue;
      }
      return true;
    }
    return false;
  });
  return filteredMessages;
}

export function filterEvents(
  events: CosmosEvent[],
  filterOrFilters?:
    | SubqlCosmosEventFilter
    | SubqlCosmosEventFilter[]
    | undefined,
): CosmosEvent[] {
  if (
    !filterOrFilters ||
    (filterOrFilters instanceof Array && filterOrFilters.length === 0)
  ) {
    return events;
  }

  const filters =
    filterOrFilters instanceof Array ? filterOrFilters : [filterOrFilters];
  const filteredEvents = events.filter((event) => {
    for (const filter of filters) {
      if (filter.type !== event.event.type) {
        continue;
      }
      if (
        filter.messageFilter &&
        !filterMessageData(event.msg, filter.messageFilter)
      ) {
        continue;
      }
      return true;
    }
    return false;
  });
  return filteredEvents;
}

async function getBlockByHeight(api: CosmosClient, height: number) {
  let blockInfo: Block;
  try {
    blockInfo = await api.blockInfo(height);
  } catch (e) {
    logger.error(`failed to fetch Block ${height}`);
    throw e;
  }
  return blockInfo;
}

export async function fetchCosmosBlocksArray(
  api: CosmosClient,
  blockArray: number[],
): Promise<Block[]> {
  return Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
}

export function wrapBlock(
  block: Block,
  txs: readonly IndexedTx[],
): CosmosBlock {
  return {
    block: block,
    txs: txs as IndexedTx[],
  };
}

export function wrapTx(
  block: CosmosBlock,
  txInfos: readonly IndexedTx[],
): CosmosTransaction[] {
  return txInfos.map((txInfo, idx) => ({
    idx,
    block: block,
    tx: txInfo,
    decodedTx: decodeTxRaw(txInfo.tx),
  }));
}

export function wrapMsg(
  block: CosmosBlock,
  txs: CosmosTransaction[],
  api: CosmosClient,
): CosmosMessage[] {
  const msgs: CosmosMessage[] = [];
  for (const tx of txs) {
    for (let i = 0; i < tx.decodedTx.body.messages.length; i++) {
      const decodedMsg = api.decodeMsg(tx.decodedTx.body.messages[i]);
      const msg: CosmosMessage = {
        idx: i,
        tx: tx,
        block: block,
        msg: {
          typeUrl: tx.decodedTx.body.messages[i].typeUrl,
          ...decodedMsg,
        },
      };
      msgs.push(msg);
    }
  }
  return msgs;
}

export function wrapEvent(
  block: CosmosBlock,
  txs: CosmosTransaction[],
  api: CosmosClient,
): CosmosEvent[] {
  const events: CosmosEvent[] = [];
  for (const tx of txs) {
    let logs: Log[];
    try {
      logs = parseRawLog(tx.tx.rawLog) as Log[];
    } catch (e) {
      continue;
    }
    for (const log of logs) {
      const decodedMsg = api.decodeMsg(
        tx.decodedTx.body.messages[log.msg_index],
      );
      const msg: CosmosMessage = {
        idx: log.msg_index,
        tx: tx,
        block: block,
        msg: {
          typeUrl: tx.decodedTx.body.messages[log.msg_index].typeUrl,
          ...decodedMsg,
        },
      };
      for (let i = 0; i < log.events.length; i++) {
        const event: CosmosEvent = {
          idx: i,
          msg: msg,
          tx: tx,
          block: block,
          log: log,
          event: log.events[i],
        };
        events.push(event);
      }
    }
  }

  return events;
}

export async function fetchBlocksBatches(
  api: CosmosClient,
  blockArray: number[],
): Promise<BlockContent[]> {
  const blocks = await fetchCosmosBlocksArray(api, blockArray);
  return Promise.all(
    blocks.map(async (blockInfo) => {
      const txHashes = blockInfo.txs;
      if (txHashes === null || txHashes.length === 0) {
        return <BlockContent>{
          block: wrapBlock(blockInfo, []),
          transactions: [],
          messages: [],
          events: [],
        };
      }

      const txInfos = await api.txInfoByHeight(blockInfo.header.height);
      const block = wrapBlock(blockInfo, txInfos);
      const txs = wrapTx(block, txInfos);
      const msgs = wrapMsg(block, txs, api);
      const events = wrapEvent(block, txs, api);
      return <BlockContent>{
        block: block,
        transactions: txs,
        messages: msgs,
        events: events,
      };
    }),
  );
}
