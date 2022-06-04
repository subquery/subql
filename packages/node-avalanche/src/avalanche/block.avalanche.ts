// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  isRuntimeDataSourceV0_2_0,
  SubstrateDataSource,
} from '@subql/common-avalanche';
import {
  AvalancheBlock,
  AvalancheBlockWrapper,
  AvalancheTransactionFilter,
  AvalancheLog,
  AvalancheLogFilter,
  AvalancheResult,
  AvalancheTransaction,
} from '@subql/types';
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
    this._logs = flatten(
      _block.transactions.map((tx) => tx.receipt.logs),
    ) as AvalancheLog<AvalancheResult>[];
    this._logs = this._logs.filter((log) => log.topics.length > 0);
    this._logs.map((log) => formatLog(log));
    this._block.logs = this._logs;
  }

  get block(): AvalancheBlock {
    return this._block;
  }

  get blockHeight(): number {
    return this._block.number;
  }

  get hash(): string {
    return this._block.hash;
  }

  transactions(
    filter?: AvalancheTransactionFilter,
    ds?: SubstrateDataSource,
  ): AvalancheTransaction[] {
    if (!filter) {
      return this.block.transactions;
    }

    let address: string | undefined;
    if (isRuntimeDataSourceV0_2_0(ds)) {
      address = ds?.options?.address;
    }

    return this.block.transactions.filter((t) =>
      this.filterTransactionsProcessor(t, filter, address),
    );
  }

  logs(filter?: AvalancheLogFilter, ds?: SubstrateDataSource): AvalancheLog[] {
    if (!filter) {
      return this._logs;
    }

    let address: string | undefined;
    if (isRuntimeDataSourceV0_2_0(ds)) {
      address = ds?.options?.address;
    }

    return this._logs.filter((log) =>
      this.filterLogsProcessor(log, filter, address),
    );
  }

  private filterTransactionsProcessor(
    transaction: AvalancheTransaction,
    filter: AvalancheTransactionFilter,
    address?: string,
  ): boolean {
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

  private filterLogsProcessor(
    log: AvalancheLog,
    filter: AvalancheLogFilter,
    address?: string,
  ): boolean {
    if (address && !stringNormalizedEq(address, log.address)) {
      return false;
    }

    if (filter.topics) {
      for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
        const topic = filter.topics[i];
        if (!topic) {
          continue;
        }

        if (!hexStringEq(eventToTopic(topic), log.topics[i])) {
          return false;
        }
      }
    }
    return true;
  }
}
