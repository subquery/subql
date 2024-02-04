// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Networkish } from '@ethersproject/networks';
import { getLogger } from '@subql/node-core';
import { BigNumber, constants } from 'ethers';
import { JsonRpcBatchProvider } from '../json-rpc-batch-provider';
import { ConnectionInfo } from '../web';

const logger = getLogger('celo-batch-provider');

export class CeloJsonRpcBatchProvider extends JsonRpcBatchProvider {
  private flanHardForkBlock = BigNumber.from('16068685');
  constructor(url?: ConnectionInfo | string, network?: Networkish) {
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
