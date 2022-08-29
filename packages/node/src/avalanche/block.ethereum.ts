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
  AvalancheBlockFilter,
  EthereumBlockWrapper,
  EthereumTransaction,
} from '@subql/types-avalanche';
import { flatten } from 'lodash';
import {
  eventToTopic,
  functionToSighash,
  hexStringEq,
  stringNormalizedEq,
} from '../utils/string';
import { formatLog } from './utils.avalanche';
import { ethers } from 'ethers';

export class EthereumBlockWrapped implements EthereumBlockWrapper {
  private _logs: ethers.providers.Log[];
  constructor(
    private _block: ethers.providers.Block,
    private _txs: EthereumTransaction[],
  ) {
    this._logs = flatten(_txs.map((tx) => tx.receipt.logs));
  }

  get block(): ethers.providers.Block {
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

  get logs(): ethers.providers.Log[] {
    return this._logs;
  }

  static filterBlocksProcessor(
    block: ethers.providers.Block,
    filter: AvalancheBlockFilter,
  ): boolean {
    if (filter.modulo && block.number % filter.modulo !== 0) {
      return false;
    }
    return true;
  }

  static filterTransactionsProcessor(
    transaction: EthereumTransaction,
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
      transaction.data.indexOf(functionToSighash(filter.function)) !== 0
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
