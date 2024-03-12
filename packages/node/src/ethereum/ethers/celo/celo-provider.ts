// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { WebSocketProvider, BaseProvider } from '@ethersproject/providers';
import { BigNumber, constants } from 'ethers';
import { JsonRpcBatchProvider } from '../json-rpc-batch-provider';
import { JsonRpcProvider } from '../json-rpc-provider';

/* This mixin replaces the block formatter on any provider with specific celo changes */
type Constructor = new (...args: any[]) => BaseProvider;
function CeloBlockFormatterMixin<B extends Constructor>(Base: B) {
  return class CeloProvider extends Base {
    #flanHardForkBlock = BigNumber.from('16068685');

    constructor(...args: any[]) {
      super(...args);

      const originalBlockFormatter = this.formatter._block;
      this.formatter._block = (value, format) => {
        return originalBlockFormatter(
          {
            gasLimit:
              BigNumber.from(value.number) < this.#flanHardForkBlock
                ? constants.Zero
                : value.gasLimit,
            ...value,
          },
          format,
        );
      };
    }
  };
}

export const CeloWsProvider = CeloBlockFormatterMixin(WebSocketProvider);
export const CeloJsonRpcProvider = CeloBlockFormatterMixin(JsonRpcProvider);
export const CeloJsonRpcBatchProvider =
  CeloBlockFormatterMixin(JsonRpcBatchProvider);
