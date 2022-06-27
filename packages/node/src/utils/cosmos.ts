// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { sha256 } from '@cosmjs/crypto';
import { toHex } from '@cosmjs/encoding';
import { decodeTxRaw } from '@cosmjs/proto-signing';
import { Block } from '@cosmjs/stargate';
import { Log, parseRawLog } from '@cosmjs/stargate/build/logs';
import { BlockResultsResponse, TxData } from '@cosmjs/tendermint-rpc';
import { isRuntimeCosmosDs } from '@subql/common-cosmos';
import {
  SubqlCosmosEventFilter,
  SubqlCosmosMessageFilter,
  CosmosBlock,
  CosmosEvent,
  CosmosTransaction,
  CosmosMessage,
  SubqlCosmosHandlerKind,
} from '@subql/types-cosmos';
import { transpileModule } from 'typescript';
import { SubqlProjectDs } from '../configure/SubqueryProject';
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
      if (
        filter.values[key] !==
        key.split('.').reduce((acc, curr) => acc[curr], data.msg.decodedMsg)
      ) {
        return false;
      }
    }
  }
  if (
    filter.type === '/cosmwasm.wasm.v1.MsgExecuteContract' &&
    filter.contractCall &&
    !(
      filter.contractCall === data.msg.decodedMsg.msg ||
      filter.contractCall in data.msg.decodedMsg.msg
    )
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
    get decodedTx() {
      delete (this as any).decodedTx;
      return ((this.decodedTx as any) = decodeTxRaw(block.block.txs[idx]));
    },
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
      get decodedMsg() {
        delete this.decodedMsg;
        return (this.decodedMsg = api.decodeMsg(rawMessage));
      },
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
      logger.warn('Failed to parse raw log, most likely a failed transaction');
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
    try {
      assert(
        blockResults.results.length === blockInfo.txs.length,
        `txInfos doesn't match up with block (${blockInfo.header.height}) transactions expected ${blockInfo.txs.length}, received: ${blockResults.results.length}`,
      );

      // Make non-readonly
      const results = [...blockResults.results];

      return new LazyBlockContent(blockInfo, results, api);
    } catch (e) {
      logger.error(
        e,
        `Failed to fetch and prepare block ${blockInfo.header.height}`,
      );
      throw e;
    }
  });
}

class LazyBlockContent implements BlockContent {
  private _wrappedBlock: CosmosBlock;
  private _wrappedTransaction: CosmosTransaction[];
  private _wrappedMessage: CosmosMessage[];
  private _wrappedEvent: CosmosEvent[];

  constructor(
    private _blockInfo: Block,
    private _results: TxData[],
    private _api: CosmosClient,
  ) {}

  get block() {
    if (!this._wrappedBlock) {
      this._wrappedBlock = wrapBlock(this._blockInfo, this._results);
    }
    return this._wrappedBlock;
  }

  get transactions() {
    if (!this._wrappedTransaction) {
      this._wrappedTransaction = wrapTx(this.block, this._results);
    }
    return this._wrappedTransaction;
  }

  get messages() {
    if (!this._wrappedMessage) {
      this._wrappedMessage = wrapMsg(this.block, this.transactions, this._api);
    }
    return this._wrappedMessage;
  }

  get events() {
    if (!this._wrappedEvent) {
      this._wrappedEvent = wrapEvent(this.block, this.transactions, this._api);
    }
    return this._wrappedEvent;
  }
}
