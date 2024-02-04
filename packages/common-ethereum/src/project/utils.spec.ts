// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isEthereumOrZilliqaAddress} from './utils';

describe('Project Utils', () => {
  it('can validate Ethereum and Zilliqa addresses', () => {
    // Ethereum addresses
    expect(isEthereumOrZilliqaAddress('0x0000000000000000000000000000000000000000')).toBeTruthy();
    expect(isEthereumOrZilliqaAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')).toBeTruthy();

    // Zilliqa addresses
    expect(isEthereumOrZilliqaAddress('0x7Aa7eA9f4534d8D70224b9c2FB165242F321F12b')).toBeTruthy();
    expect(isEthereumOrZilliqaAddress('zil102n74869xnvdwq3yh8p0k9jjgtejruft268tg8')).toBeTruthy();

    // Invalid addresses
    expect(isEthereumOrZilliqaAddress('')).toBeFalsy();
    expect(isEthereumOrZilliqaAddress('hello world')).toBeFalsy();
    expect(isEthereumOrZilliqaAddress('zil1')).toBeFalsy();
    expect(isEthereumOrZilliqaAddress('0x0')).toBeFalsy();
  });
});
