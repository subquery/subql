// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Networkish } from '@ethersproject/networks';
import { WebSocketProvider } from '@ethersproject/providers';
import { getLogger } from '@subql/node-core';
import { BigNumber, constants } from 'ethers';

const logger = getLogger('celo-ws-provider');

export class CeloWsProvider extends WebSocketProvider {
  private flanHardForkBlock = BigNumber.from('16068685');
  constructor(url?: string, network?: Networkish) {
    super(url, network);

    const originalBlockFormatter = this.formatter._block;
    this.formatter._block = (value, format) => {
      return originalBlockFormatter(
        {
          gasLimit:
            BigNumber.from(value.number) < this.flanHardForkBlock
              ? constants.Zero
              : value.gasLimit,
          ...value,
        },
        format,
      );
    };
  }
}
