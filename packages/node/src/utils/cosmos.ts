// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { sha256 } from '@cosmjs/crypto';
import { toHex } from '@cosmjs/encoding';
import { Uint53 } from '@cosmjs/math';
import { decodeTxRaw } from '@cosmjs/proto-signing';
import { Block } from '@cosmjs/stargate';
import { Log, parseRawLog } from '@cosmjs/stargate/build/logs';
import {
  BlockResultsResponse,
  TxData,
  Header,
  toRfc3339WithNanoseconds,
} from '@cosmjs/tendermint-rpc';
import { BlockResponse } from '@cosmjs/tendermint-rpc/build/tendermint34/responses';
import { getLogger } from '@subql/node-core';
import {
  SubqlCosmosEventFilter,
  SubqlCosmosMessageFilter,
  CosmosBlock,
  CosmosEvent,
  CosmosTransaction,
  CosmosMessage,
  SubqlCosmosBlockFilter,
  SubqlCosmosTxFilter,
} from '@subql/types-cosmos';
import { CosmosClient } from '../indexer/api.service';
import { BlockContent } from '../indexer/types';

const logger = getLogger('fetch');

export function blockResponseToBlock(response: BlockResponse): Block {
  return {
    id: toHex(response.blockId.hash).toUpperCase(),
    header: {
      version: {
        block: new Uint53(response.block.header.version.block).toString(),
        app: new Uint53(response.block.header.version.app).toString(),
      },
      height: response.block.header.height,
      chainId: response.block.header.chainId,
      time: toRfc3339WithNanoseconds(response.block.header.time),
    },
    txs: response.block.txs,
  };
}

export function filterBlock(
  data: CosmosBlock,
  filter?: SubqlCosmosBlockFilter,
): boolean {
  if (!filter) {
    return true;
  }
  if (filter.modulo && data.block.header.height % filter.modulo !== 0) {
    return false;
  }
  return true;
}

export function filterTx(
  data: CosmosTransaction,
  filter?: SubqlCosmosTxFilter,
): boolean {
  if ((!filter || !filter.includeFailedTx) && data.tx.code !== 0) {
    logger.debug(`filtered out failed tx {${data.hash}}`);
    return false;
  }
  if (filter?.includeFailedTx) {
    return true;
  }
  return true;
}

export function filterMessageData(
  data: CosmosMessage,
  filter?: SubqlCosmosMessageFilter,
): boolean {
  if (!filter) return true;
  if (!filterTx(data.tx, filter)) {
    return false;
  }
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

  const filteredMessages = messages.filter((message) =>
    filters.find((filter) => filterMessageData(message, filter)),
  );
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

  for (const filterKey in filter.attributes) {
    if (
      !event.event.attributes.find(
        ({ key, value }) =>
          key === filterKey && value === filter.attributes[filterKey],
      )
    ) {
      return false;
    }
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
  const filteredEvents = events.filter((event) =>
    filters.find((filter) => filterEvent(event, filter)),
  );
  return filteredEvents;
}

async function getBlockByHeight(
  api: CosmosClient,
  height: number,
): Promise<[BlockResponse, BlockResultsResponse]> {
  return Promise.all([
    api.blockInfo(height).catch((e) => {
      const error = CosmosClient.handleError(e);
      logger.error(error, `failed to fetch block info ${height}`);
      throw error;
    }),
    api.blockResults(height).catch((e) => {
      const error = CosmosClient.handleError(e);
      logger.error(error, `failed to fetch block results ${height}`);
      throw error;
    }),
  ]);
}

export async function fetchCosmosBlocksArray(
  api: CosmosClient,
  blockArray: number[],
): Promise<[BlockResponse, BlockResultsResponse][]> {
  return Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
}

export function wrapBlock(
  block: Block,
  header: Header,
  txs: TxData[],
): CosmosBlock {
  return {
    block: block,
    header: header,
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
      logger.debug('Failed to parse raw log, most likely a failed transaction');
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
        blockResults.results.length === blockInfo.block.txs.length,
        `txInfos doesn't match up with block (${blockInfo.block.header.height}) transactions expected ${blockInfo.block.txs.length}, received: ${blockResults.results.length}`,
      );

      // Make non-readonly
      const results = [...blockResults.results];

      return new LazyBlockContent(blockInfo, results, api);
    } catch (e) {
      logger.error(
        e,
        `Failed to fetch and prepare block ${blockInfo.block.header.height}`,
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
    private _blockInfo: BlockResponse,
    private _results: TxData[],
    private _api: CosmosClient,
  ) {}

  get block() {
    if (!this._wrappedBlock) {
      const block = blockResponseToBlock(this._blockInfo);
      this._wrappedBlock = wrapBlock(
        block,
        this._blockInfo.block.header,
        this._results,
      );
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

export function calcInterval(api: CosmosClient): number {
  // TODO find a way to get this from the blockchain
  return 6000;
}
