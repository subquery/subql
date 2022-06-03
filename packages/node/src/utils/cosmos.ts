// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { sha256 } from '@cosmjs/crypto';
import { toHex } from '@cosmjs/encoding';
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
import { CosmosClient } from '../indexer/api.service';
import { BlockContent } from '../indexer/types';
import { getLogger } from './logger';

const logger = getLogger('fetch');

export function filterMessageData(
  data: CosmosMessage,
  filter?: SubqlCosmosMessageFilter,
): boolean {
  if (!filter) return true;
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
    filters.find((filter) => filterMessageData(message, filter));
  });
  return filteredMessages;
}

export function filterEvent(
  event: CosmosEvent,
  filter?: SubqlCosmosEventFilter,
): boolean {
  if (!filter) return true;
  if (filter.type !== event.event.type) {
    return false;
  }

  if (
    filter.messageFilter &&
    !filterMessageData(event.msg, filter.messageFilter)
  ) {
    return false;
  }

  return true;
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
    filters.find((filter) => filterEvent(event, filter));
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

function wrapBlock(block: Block, txs: readonly IndexedTx[]): CosmosBlock {
  return {
    block: block,
    txs: txs as IndexedTx[],
  };
}

function wrapTx(
  block: CosmosBlock,
  txInfos: readonly IndexedTx[],
): CosmosTransaction[] {
  return txInfos.map((tx, idx) => ({
    idx,
    block: block,
    tx,
    decodedTx: decodeTxRaw(tx.tx),
  }));
}

function wrapCosmosMsg(
  block: CosmosBlock,
  tx: CosmosTransaction,
  idx: number,
  api: CosmosClient,
): CosmosMessage {
  const rawMessage = tx.decodedTx.body.messages[idx];
  const msg: CosmosMessage = {
    idx,
    tx: tx,
    block: block,
    msg: {
      typeUrl: rawMessage.typeUrl,
      ...api.decodeMsg<any>(rawMessage),
    },
  };

  return msg;
}

function wrapMsg(
  block: CosmosBlock,
  txs: CosmosTransaction[],
  api: CosmosClient,
): CosmosMessage[] {
  const msgs: CosmosMessage[] = [];
  for (const tx of txs) {
    for (let i = 0; i < tx.decodedTx.body.messages.length; i++) {
      msgs.push(wrapCosmosMsg(block, tx, i, api));
    }
  }
  return msgs;
}

function wrapEvent(
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
      logger.warn(e, 'Faied to parse raw log');
      continue;
    }
    for (const log of logs) {
      const msg = wrapCosmosMsg(block, tx, log.msg_index, api);
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
      const txInfos =
        blockInfo.txs.length <= 0
          ? []
          : await api.txInfoByHeight(blockInfo.header.height);

      assert(
        txInfos.length === blockInfo.txs.length,
        `txInfos doesn't match up with block (${blockInfo.header.height}) transactions expected ${blockInfo.txs.length}, received: ${txInfos.length}`,
      );

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
