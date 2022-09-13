// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  AvalancheBlock,
  AvalancheBlockWrapper,
  AvalancheTransactionFilter,
  AvalancheLog,
  AvalancheLogFilter,
  AvalancheResult,
  AvalancheTransaction,
  AvalancheBlockFilter,
} from '@subql/types-avalanche';
import { flatten } from 'lodash';
import {
  eventToTopic,
  functionToSighash,
  hexStringEq,
  stringNormalizedEq,
} from '../utils/string';
import { formatLog } from './utils.avalanche';

export class AvalancheBlockWrapped implements AvalancheBlockWrapper {
  private _logs: AvalancheLog[];
  constructor(private _block: AvalancheBlock) {
    this._logs = flatten(_block.transactions.map((tx) => tx.receipt.logs)).map(
      (log) => formatLog(log, _block),
    ) as AvalancheLog<AvalancheResult>[];
    this.block.logs = this._logs.map((log) => {
      const logCopy = { ...log };
      logCopy.block = undefined;
      return logCopy;
    });
    this.block.transactions = this.block.transactions.map((tx) => {
      tx.receipt.logs = tx.receipt.logs.map((log) => {
        const logCopy = { ...log };
        logCopy.block = undefined;
        return logCopy;
      });
      return tx;
    });
  }

  get block(): AvalancheBlock {
    return this._block;
  }

  get blockHeight(): number {
    return this.block.number;
  }

  get hash(): string {
    return this.block.hash;
  }

  get transactions(): AvalancheTransaction[] {
    return this.block.transactions;
  }

  get logs(): AvalancheLog<AvalancheResult>[] {
    return this._logs;
  }

  static filterBlocksProcessor(
    block: AvalancheBlock,
    filter: AvalancheBlockFilter,
  ): boolean {
    if (filter?.modulo && block.number % filter.modulo !== 0) {
      return false;
    }
    return true;
  }

  static filterTransactionsProcessor(
    transaction: AvalancheTransaction,
    filter: AvalancheTransactionFilter,
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
    log: AvalancheLog,
    filter: AvalancheLogFilter,
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
