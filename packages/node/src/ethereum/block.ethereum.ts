// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  EthereumBlock,
  EthereumTransactionFilter,
  EthereumLog,
  EthereumLogFilter,
  EthereumResult,
  EthereumBlockFilter,
  EthereumBlockWrapper,
  EthereumTransaction,
} from '@subql/types-ethereum';
import { flatten } from 'lodash';
import {
  eventToTopic,
  functionToSighash,
  hexStringEq,
  stringNormalizedEq,
} from '../utils/string';
import { formatLog } from './utils.ethereum';

export class EthereumBlockWrapped implements EthereumBlockWrapper {
  private _logs: EthereumLog[];
  constructor(
    private _block: EthereumBlock,
    private _txs: EthereumTransaction[],
  ) {
    this._logs = flatten(_txs.map((tx) => tx.receipt.logs)).map((log) =>
      formatLog(log, _block),
    ) as EthereumLog[];
    this._logs.map((log) => {
      log.block = this.block;
      return log;
    });
    this.block.logs = this._logs.map((log) => {
      const logCopy = { ...log };
      logCopy.block = undefined;
      return logCopy;
    });
  }

  get block(): EthereumBlock {
    return this._block;
  }

  get blockHeight(): number {
    return this.block.number;
  }

  get hash(): string {
    return this.block.hash;
  }

  get transactions(): EthereumTransaction[] {
    return this._txs;
  }

  get logs(): EthereumLog[] {
    return this._logs;
  }

  static filterBlocksProcessor(
    block: EthereumBlock,
    filter: EthereumBlockFilter,
    address?: string,
  ): boolean {
    if (filter?.modulo && block.number % filter.modulo !== 0) {
      return false;
    }
    return true;
  }

  static filterTransactionsProcessor(
    transaction: EthereumTransaction,
    filter: EthereumTransactionFilter,
    address?: string,
  ): boolean {
    if (!filter) return true;
    if (filter.to && !stringNormalizedEq(filter.to, transaction.to)) {
      return false;
    }
    if (filter.from && !stringNormalizedEq(filter.from, transaction.from)) {
      return false;
    }
    if (address && !filter.to && !stringNormalizedEq(address, transaction.to)) {
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

  static filterLogsProcessor(
    log: EthereumLog,
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
        if (!hexStringEq(eventToTopic(topic), log.topics[i])) {
          return false;
        }
      }
    }
    return true;
  }
}
