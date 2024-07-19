// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Formatter } from '@ethersproject/providers';
import { IBlock } from '@subql/node-core';
import { EthereumBlock, EthereumReceipt } from '@subql/types-ethereum';
import { EthereumApi } from '../../../ethereum';
import {
  formatBlock,
  formatBlockUtil,
  formatLog,
  formatReceipt,
  formatTransaction,
} from '../../../ethereum/utils.ethereum';
import { RawEthBlock } from './types';

export function rawBlockToEthBlock(
  block: RawEthBlock,
  api: EthereumApi,
): IBlock<EthereumBlock> {
  try {
    // Use the formatter from the api, it could have custom formats e.g l1Gas fields
    const formatter = api?.api.formatter ?? new Formatter();

    const ethBlock = formatBlock({
      ...block.header,
      transactions: [],
    });

    ethBlock.logs = Formatter.arrayOf(formatter.filterLog.bind(formatter))(
      block.logs ?? [],
    ).map((l) => formatLog(l, ethBlock));

    ethBlock.transactions = (block.transactions ?? []).map((tx) => ({
      ...formatTransaction(tx, ethBlock),
      logs: ethBlock.logs.filter((l) => l.transactionHash === tx.hash),
      receipt: <R extends EthereumReceipt>(): Promise<R> =>
        api.getTransactionReceipt(tx.hash).then((r) => formatReceipt<R>(r)),
    }));

    return formatBlockUtil(ethBlock);
  } catch (e: any) {
    throw new Error(
      `Convert raw block to Eth block failed at ${block.header.number},${e.message}`,
    );
  }
}
