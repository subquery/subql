// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { getLogger } from '@subql/node-core';
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
  if (filter?.timestamp) {
    return filterBlockTimestamp(block, filter as SubqlProjectBlockFilter);
  }
  return true;
}

export function filterBlockTimestamp(
  block: EthereumBlock,
  filter: SubqlProjectBlockFilter,
): boolean {
  const unixTimestamp = Number(block.timestamp) * 1000; // Multiply to add MS
  if (unixTimestamp > filter.cronSchedule.next) {
    logger.info(
      `Block with timestamp ${new Date(
        unixTimestamp,
      ).toString()} is about to be indexed`,
    );
    logger.info(
      `Next block will be indexed at ${new Date(
        filter.cronSchedule.next,
      ).toString()}`,
    );
    filter.cronSchedule.schedule.prev();
    return true;
  } else {
    filter.cronSchedule.schedule.prev();
    return false;
  }
}

export function filterTransactionsProcessor(
  transaction: EthereumTransaction,
  filter: EthereumTransactionFilter,
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
  if (
    filter.function &&
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
  // Light etherum block just contains transaction hashes for transactions. If the block has no transactions then both types would be the same
  return typeof (block as EthereumBlock).transactions[0] !== 'string';
}
