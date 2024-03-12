// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EthereumReceipt } from '@subql/types-ethereum';
import { BigNumber } from 'ethers';
import { formatReceipt } from '../../utils.ethereum';
import { JsonRpcProvider } from '../json-rpc-provider';
import { OPJsonRpcProvider } from './op-provider';

const HTTP_ENDPOINT = 'https://mainnet.optimism.io';

type OPReceiptFields = {
  l1Fee: BigNumber;
  l1FeeScalar: number;
  l1GasPrice: BigNumber;
  l1GasUsed: BigNumber;
};

describe('OPRPCProviders', () => {
  let provider: JsonRpcProvider;

  // For some reason defining this in before all fails
  beforeEach(() => {
    provider = new OPJsonRpcProvider(HTTP_ENDPOINT);
  });

  // This returns a value now, needs further investigation
  it('should have extra fields in transactions', async () => {
    const receipt = formatReceipt<EthereumReceipt & OPReceiptFields>(
      await provider.getTransactionReceipt(
        '0x5496af6ad1d619279d82b8f4c94cf3f8da8c02f22481c66a840ae9dd3f5e1a23',
      ),
      null,
    );

    expect(receipt.l1Fee).toEqual(BigNumber.from('0x1375ad1b756e'));
    expect(receipt.l1FeeScalar).toEqual(0.684);
    expect(receipt.l1GasPrice).toEqual(BigNumber.from('0x02fae225ae'));
    expect(receipt.l1GasUsed).toEqual(BigNumber.from('0x098c'));
  });

  it('should work with a network that isnt OP based', async () => {
    const provider = new OPJsonRpcProvider('https://eth.llamarpc.com');

    const receipt = formatReceipt<EthereumReceipt & OPReceiptFields>(
      await provider.getTransactionReceipt(
        '0x7c20ced906264f81929802ee6b642d003a236c542c5de6298ede5b2a4f7f9bb9',
      ),
      null,
    );

    expect(receipt.l1Fee).toBeUndefined();
    expect(receipt.l1FeeScalar).toBeUndefined();
    expect(receipt.l1GasPrice).toBeUndefined();
    expect(receipt.l1GasUsed).toBeUndefined();
  }, 10000);
});
