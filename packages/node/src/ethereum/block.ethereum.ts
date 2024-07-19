// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { filterBlockTimestamp, getLogger } from '@subql/node-core';
import {
  EthereumBlock,
  EthereumTransactionFilter,
  EthereumLog,
  EthereumLogFilter,
  EthereumBlockFilter,
  EthereumTransaction,
  LightEthereumLog,
} from '@subql/types-ethereum';
import { SubqlProjectBlockFilter } from '../configure/SubqueryProject';
import { BlockContent } from '../indexer/types';
import {
  eventToTopic,
  functionToSighash,
  hexStringEq,
  stringNormalizedEq,
} from '../utils/string';

const logger = getLogger('block.ethereum');

export function filterBlocksProcessor(
  block: EthereumBlock,
  filter: EthereumBlockFilter,
  address?: string,
): boolean {
  if (filter?.modulo && block.number % filter.modulo !== 0) {
    return false;
  }
  // Multiply to add MS
  if (
    !filterBlockTimestamp(
      Number(block.timestamp) * 1000,
      filter as SubqlProjectBlockFilter,
    )
  ) {
    return false;
  }
  return true;
}

export function filterTransactionsProcessor(
  transaction: EthereumTransaction,
  filter?: EthereumTransactionFilter,
  address?: string,
): boolean {
  if (!filter) return true;

  if (
    filter.to === null &&
    !(transaction.to === null || transaction.to === undefined)
  ) {
    return false;
  }

  if (filter.to && !stringNormalizedEq(filter.to, transaction.to)) {
    return false;
  }
  if (filter.from && !stringNormalizedEq(filter.from, transaction.from)) {
    return false;
  }
  if (
    address &&
    filter.to === undefined &&
    !stringNormalizedEq(address, transaction.to)
  ) {
    return false;
  }
  if (filter.function === null || filter.function === '0x') {
    if (transaction.input !== '0x') {
      return false;
    }
  } else if (
    filter.function !== undefined &&
    transaction.input.indexOf(functionToSighash(filter.function)) !== 0
  ) {
    return false;
  }

  return true;
}

export function filterLogsProcessor(
  log: EthereumLog | LightEthereumLog,
  filter: EthereumLogFilter,
  address?: string,
): boolean {
  if (address && !stringNormalizedEq(address, log.address)) {
    return false;
  }

  if (!filter) return true;

  if (filter.topics) {
    for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
      const topic = filter.topics[i];
      if (!topic) {
        continue;
      }

      if (!log.topics[i]) {
        return false;
      }

      if (topic === '!null') {
        return true;
      }

      if (!hexStringEq(eventToTopic(topic), log.topics[i])) {
        return false;
      }
    }
  }
  return true;
}

export function isFullBlock(block: BlockContent): block is EthereumBlock {
  // Light etherum block just contains transaction hashes for transactions.
  // If the block has no transactions then both types would be the same

  if (block.transactions.length && block.logs.length) {
    return typeof (block as EthereumBlock).transactions[0] !== 'string';
  }
  return false;
}
