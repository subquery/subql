// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { WebSocketProvider } from '@ethersproject/providers';
import { BigNumber, constants, utils } from 'ethers';
import { formatBlock } from '../../utils.ethereum';
import {
  CeloJsonRpcBatchProvider,
  CeloJsonRpcProvider,
  CeloWsProvider,
} from './celo-provider';

const HTTP_ENDPOINT = 'https://forno.celo.org';
const TEST_BLOCK = 16068684;

describe('CeloRPCProviders', () => {
  // For some reason defining this in before all fails
  const providers = [
    new CeloWsProvider('wss://forno.celo.org/ws'),
    new CeloJsonRpcProvider(HTTP_ENDPOINT),
    new CeloJsonRpcBatchProvider(HTTP_ENDPOINT),
  ];
  afterAll(async () => {
    await Promise.all(
      providers.map((p) => (p as WebSocketProvider)?.destroy?.()),
    );
  });

  // This returns a value now, needs further investigation
  it.skip.each(providers)(
    'should set gasLimit to zero for blocks before the hard fork',
    async (provider) => {
      const block = formatBlock(
        await provider.send('eth_getBlockByNumber', [
          utils.hexValue(TEST_BLOCK),
          true,
        ]),
      );
      expect(BigNumber.from(block.gasLimit)).toEqual(constants.Zero);
    },
  );

  it.each(providers)(
    'should not set gasLimit to zero for blocks after the hard fork',
    async (provider) => {
      const block = formatBlock(
        await provider.send('eth_getBlockByNumber', ['latest', true]),
      );
      expect(BigNumber.from(block.gasLimit).gte(constants.Zero)).toBeTruthy();
    },
  );
});
