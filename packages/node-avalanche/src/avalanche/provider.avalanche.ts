// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AvalancheProvider as AvProv } from '@subql/types-avalanche';
import { EVMAPI } from 'avalanche/dist/apis/evm';

export class AvalancheProvider implements AvProv {
  constructor(private cchain: EVMAPI) {}

  async getBalance(address: string): Promise<any> {
    const rep = (
      await this.cchain.callMethod(
        'eth_getBalance',
        [address, 'latest'],
        '/ext/bc/C/rpc',
      )
    ).data.result;
    return rep;
  }

  async getTransactionCount(address: string): Promise<any> {
    const rep = (
      await this.cchain.callMethod(
        'eth_getTransactionCount',
        [address, 'latest'],
        '/ext/bc/C/rpc',
      )
    ).data.result;
    return rep;
  }

  async getCode(address: string): Promise<any> {
    const rep = (
      await this.cchain.callMethod(
        'eth_getCode',
        [address, 'latest'],
        '/ext/bc/C/rpc',
      )
    ).data.result;
    return rep;
  }

  async getStorageAt(address: string, position: string): Promise<any> {
    const rep = (
      await this.cchain.callMethod(
        'eth_getStorageAt',
        [address, position, 'latest'],
        '/ext/bc/C/rpc',
      )
    ).data.result;
    return rep;
  }

  async call(
    to: string,
    from?: string,
    gas?: string,
    gasPrice?: string,
    value?: string,
    data?: string,
  ): Promise<any> {
    const rep = (
      await this.cchain.callMethod(
        'eth_getStorageAt',
        [{ from, to, gas, gasPrice, value, data }, 'latest'],
        '/ext/bc/C/rpc',
      )
    ).data.result;
    return rep;
  }
}
