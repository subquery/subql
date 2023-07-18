// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  EthereumBlock,
  EthereumTransactionFilter,
  EthereumLog,
  EthereumLogFilter,
  EthereumBlockFilter,
  EthereumBlockWrapper,
  EthereumTransaction,
} from '@subql/types-ethereum';
import {
  eventToTopic,
  functionToSighash,
  hexStringEq,
  stringNormalizedEq,
} from '../utils/string';

export class EthereumBlockWrapped implements EthereumBlockWrapper {
  constructor(
    private _block: EthereumBlock,
    private _txs: EthereumTransaction[],
    private _logs: EthereumLog[],
  ) {
    this._block.transactions = this._txs;
    this._block.logs = this._logs;

    // Set logs on tx
    this._logs.forEach((l) => {
      const tx = this._txs.find((tx) => tx.hash === l.transactionHash);

      if (!tx) return;
      tx.logs = tx.logs ? [...tx.logs, l] : [l];
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
}
