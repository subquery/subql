// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { sha256 } from '@cosmjs/crypto';
import { toHex } from '@cosmjs/encoding';
import { DecodedTxRaw, decodeTxRaw } from '@cosmjs/proto-signing';
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
      logger.error(`failed to fetch block info ${height}`);
      throw e;
    }),
    api.blockResults(height).catch((e) => {
      logger.error(`failed to fetch block results ${height}`);
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

export function wrapBlock(
  block: Block,
  txs: CosmosTransaction[],
  msgs: CosmosMessage[],
  events: CosmosEvent[],
): CosmosBlock {
  return {
    block: block,
    txs: txs,
    msgs: msgs,
    events: events,
  };
}

export function wrapTx(
  events: CosmosEvent[],
  messages: CosmosMessage[],
  block: Block,
  txResults: TxData[],
): CosmosTransaction[] {
  return txResults.map((tx, idx) => {
    const hash = toHex(sha256(block.txs[idx])).toUpperCase();
    return {
      idx,
      tx,
      hash: hash,
      decodedTx: decodeTxRaw(block.txs[idx]),
      msgs: messages.filter((msg) => msg.txHash === hash),
      events: events.filter((evt) => evt.txHash === hash),
    };
  });
}

function wrapCosmosMsg(
  idx: number,
  tx: {
    decodedTx: DecodedTxRaw;
    hash: string;
  },
  events: CosmosEvent[],
  api: CosmosClient,
): CosmosMessage {
  const rawMessage = tx.decodedTx.body.messages[idx];
  return {
    idx,
    txHash: tx.hash,
    msg: {
      typeUrl: rawMessage.typeUrl,
      ...api.decodeMsg<any>(rawMessage),
    },
    events: events.filter(
      (event) => event.log.msg_index === idx && event.txHash === tx.hash,
    ),
  };
}

function wrapMsg(
  events: CosmosEvent[],
  txs: {
    decodedTx: DecodedTxRaw;
    hash: string;
  }[],
  api: CosmosClient,
): CosmosMessage[] {
  const msgs: CosmosMessage[] = [];
  for (const tx of txs) {
    for (let i = 0; i < tx.decodedTx.body.messages.length; i++) {
      msgs.push(wrapCosmosMsg(i, tx, events, api));
    }
  }
  return msgs;
}

export function wrapEvent(
  txs: {
    result: TxData;
    decodedTx: DecodedTxRaw;
    hash: string;
  }[],
  api: CosmosClient,
): CosmosEvent[] {
  const events: CosmosEvent[] = [];
  for (const tx of txs) {
    let logs: Log[];
    try {
      logs = parseRawLog(tx.result.log) as Log[];
    } catch (e) {
      //parsing fails if transaction had failed.
      logger.warn(e, 'Failed to parse raw log');
      continue;
    }
    for (const log of logs) {
      const msg = wrapCosmosMsg(log.msg_index, tx, [], api);
      for (let i = 0; i < log.events.length; i++) {
        const event: CosmosEvent = {
          idx: i,
          txHash: tx.hash,
          log: log,
          msg: msg,
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
    const decodedTxs = blockInfo.txs.map((tx) => decodeTxRaw(tx));

    const events = wrapEvent(
      results.map((tx, idx) => {
        return {
          result: tx,
          decodedTx: decodedTxs[idx],
          hash: toHex(sha256(blockInfo.txs[idx])).toUpperCase(),
        };
      }),
      api,
    );

    const messages = wrapMsg(
      events,
      decodedTxs.map((tx, idx) => {
        return {
          decodedTx: tx,
          hash: toHex(sha256(blockInfo.txs[idx])).toUpperCase(),
        };
      }),
      api,
    );

    const transactions = wrapTx(events, messages, blockInfo, results);
    const block = wrapBlock(blockInfo, transactions, messages, events);

    return <BlockContent>{
      block,
      transactions,
      messages,
      events,
    };
  });
}
