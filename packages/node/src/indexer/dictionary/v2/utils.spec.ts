// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { IBlock } from '@subql/node-core';
import { EthereumBlock } from '@subql/types-ethereum';
import EventEmitter2 from 'eventemitter2';
import fetch from 'node-fetch';
import { EthereumApi } from '../../../ethereum';
import { RawEthBlock } from './types';
import { rawBlockToEthBlock } from './utils';

const DICTIONARY_URL = 'https://ethereum.node.subquery.network/public';
const RPC_URL = 'https://eth.llamarpc.com';

async function fetchDictionaryBlock(): Promise<RawEthBlock> {
  const res = await fetch(DICTIONARY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'subql_filterBlocks',
      params: [
        {
          fromBlock: '0x3e579e',
          toBlock: '0x3e579e',
          limit: '0x1',
          blockFilter: {
            logs: [
              {
                address: ['0x6f28B146804dBa2D6f944C03528A8FDbc673df2C'],
                topics0: [
                  '0xb76d0edd90c6a07aa3ff7a222d7f5933e29c6acc660c059c97837f05c4ca1a84',
                ],
              },
            ],
          },
          fieldSelector: {
            blockHeader: true,
            logs: {
              transaction: true,
            },
            transactions: {
              log: true,
            },
          },
        },
      ],
    }),
  });

  return (await res.json()).result.blocks[0];
}

describe('rawBlockToEthBlock', () => {
  const api = new EthereumApi(RPC_URL, 1, new EventEmitter2());
  let raw: RawEthBlock;
  let rpcBlock: IBlock<EthereumBlock>;

  beforeAll(async () => {
    [raw, rpcBlock] = await Promise.all([
      fetchDictionaryBlock(),
      api.fetchBlock(4085662),
    ]);
  });

  it('successfully converts a block', () => {
    const block = rawBlockToEthBlock(raw, api);

    expect(block.getHeader()).toEqual({
      blockHash:
        '0xde8e614cc05b483fe092fd0aff435011138c15c9ede862579074218d4aff5132',
      blockHeight: 4085662,
      parentHash:
        '0x669c7a2c66e38c144ad1e2845ec345b6ce7e2107edbdb331ab88d355982126a7',
    });

    expect(block.block.transactions.length).toBeGreaterThan(0);
    expect(block.block.logs.length).toBeGreaterThan(0);

    // Dictionry is going to return a subset of events/transactions so we base off dictionary block
    for (const log of block.block.logs) {
      // Remove linked types
      const { block: _1, transaction: _2, ...logRest } = log;
      const {
        block: _3,
        transaction: _4,
        ...rpcLogRest
      } = rpcBlock.block.logs[log.logIndex];
      expect(JSON.stringify(logRest)).toEqual(JSON.stringify(rpcLogRest));
    }

    for (const tx of block.block.transactions) {
      // Cast to any to remove toJSON which results in different key order
      const { logs: _1, receipt: _3, toJSON: _5, ...txRest } = tx as any;
      const {
        logs: _2,
        receipt: _4,
        toJSON: _6,
        ...rpcTxRest
      } = rpcBlock.block.transactions[Number(tx.transactionIndex)] as any;

      expect(txRest).toEqual(rpcTxRest);
    }
  }, 15000);

  it('can fetch receipts', async () => {
    const block = rawBlockToEthBlock(raw, api);

    await expect(block.block.transactions[0].receipt()).resolves.not.toThrow();
  });
});
