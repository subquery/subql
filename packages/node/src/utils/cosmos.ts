// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { sha256 } from '@cosmjs/crypto';
import { toHex } from '@cosmjs/encoding';
import { decodeTxRaw } from '@cosmjs/proto-signing';
import { Block } from '@cosmjs/stargate';
import { Log, parseRawLog } from '@cosmjs/stargate/build/logs';
import { BlockResultsResponse, TxData } from '@cosmjs/tendermint-rpc';
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

async function getBlockByHeight(
  api: CosmosClient,
  height: number,
): Promise<[Block, BlockResultsResponse]> {
  return Promise.all([
    api.blockInfo(height).catch((e) => {
      logger.error(e, `failed to fetch block info ${height}`);
      throw e;
    }),
    api.blockResults(height).catch((e) => {
      logger.error(e, `failed to fetch block results ${height}`);
      throw e;
    }),
  ]);
}

export async function fetchCosmosBlocksArray(
  api: CosmosClient,
  blockArray: number[],
): Promise<[Block, BlockResultsResponse][]> {
  return Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
}

export function wrapBlock(block: Block, txs: TxData[]): CosmosBlock {
  return {
    block: block,
    txs: txs,
  };
}

export function wrapTx(
  block: CosmosBlock,
  txResults: TxData[],
): CosmosTransaction[] {
  return txResults.map((tx, idx) => ({
    idx,
    block: block,
    tx,
    hash: toHex(sha256(block.block.txs[idx])).toUpperCase(),
    decodedTx: decodeTxRaw(block.block.txs[idx]),
  }));
}

function wrapCosmosMsg(
  block: CosmosBlock,
  tx: CosmosTransaction,
  idx: number,
  api: CosmosClient,
): CosmosMessage {
  const rawMessage = tx.decodedTx.body.messages[idx];
  return {
    idx,
    tx: tx,
    block: block,
    msg: {
      typeUrl: rawMessage.typeUrl,
      ...api.decodeMsg<any>(rawMessage),
    },
  };
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

export function wrapEvent(
  block: CosmosBlock,
  txs: CosmosTransaction[],
  api: CosmosClient,
): CosmosEvent[] {
  const events: CosmosEvent[] = [];
  for (const tx of txs) {
    let logs: Log[];
    try {
      logs = parseRawLog(tx.tx.log) as Log[];
    } catch (e) {
      //parsing fails if transaction had failed.
      logger.warn(e, 'Failed to parse raw log');
      continue;
    }
    for (const log of logs) {
      const msg = wrapCosmosMsg(block, tx, log.msg_index, api);
      for (let i = 0; i < log.events.length; i++) {
        const event: CosmosEvent = {
          idx: i,
          msg,
          tx,
          block,
          log,
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
  return blocks.map(([blockInfo, blockResults]) => {
    assert(
      blockResults.results.length === blockInfo.txs.length,
      `txInfos doesn't match up with block (${blockInfo.header.height}) transactions expected ${blockInfo.txs.length}, received: ${blockResults.results.length}`,
    );

    // Make non-readonly
    const results = [...blockResults.results];

    const block = wrapBlock(blockInfo, results);
    const transactions = wrapTx(block, results);
    const messages = wrapMsg(block, transactions, api);
    const events = wrapEvent(block, transactions, api);

    return <BlockContent>{
      block,
      transactions,
      messages,
      events,
    };
  });
}
