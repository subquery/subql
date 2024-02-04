// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { BigNumber, constants, utils } from 'ethers';
import { formatBlock } from '../../utils.ethereum';
import { CeloWsProvider } from './celo-ws-provider';

describe('CeloJsonRpcProvider', () => {
  let provider: CeloWsProvider;

  beforeEach(() => {
    provider = new CeloWsProvider('wss://forno.celo.org/ws');
  });

  // Test if gasLimit is correctly set for blocks before the hard fork
  it('should set gasLimit to zero for blocks before the hard fork', async () => {
    const block = formatBlock(
      await provider.send('eth_getBlockByNumber', [
        utils.hexValue(16068684),
        true,
      ]),
    );
    expect(BigNumber.from(block.gasLimit)).toEqual(constants.Zero);
  });

  // Test if gasLimit is correctly set for blocks after the hard fork
  it('should not set gasLimit to zero for blocks after the hard fork', async () => {
    const block = formatBlock(
      await provider.send('eth_getBlockByNumber', ['latest', true]),
    );
    expect(BigNumber.from(block.gasLimit).gte(constants.Zero)).toBeTruthy();
  });
});
