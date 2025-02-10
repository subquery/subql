// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  WebSocketProvider,
  BaseProvider,
  Formatter,
} from '@ethersproject/providers';
import { JsonRpcBatchProvider } from '../json-rpc-batch-provider';
import { JsonRpcProvider } from '../json-rpc-provider';

/* This mixin replaces the block formatter on any provider with specific OP changes */
type Constructor = new (...args: any[]) => BaseProvider;
export function OPFormatterMixin<B extends Constructor>(Base: B) {
  return class OPProvider extends Base {
    constructor(...args: any[]) {
      super(...args);

      this.formatter.formats.receipt = {
        ...this.formatter.formats.receipt,
        l1Fee: Formatter.allowNull(
          this.formatter.bigNumber.bind(this.formatter),
        ),
        l1FeeScalar: Formatter.allowNull((v) => Number(v)),
        l1GasPrice: Formatter.allowNull(
          this.formatter.bigNumber.bind(this.formatter),
        ),
        l1GasUsed: Formatter.allowNull(
          this.formatter.bigNumber.bind(this.formatter),
        ),
      };
    }
  };
}

export const OPWsProvider = OPFormatterMixin(WebSocketProvider);
export const OPJsonRpcProvider = OPFormatterMixin(JsonRpcProvider);
export const OPJsonRpcBatchProvider = OPFormatterMixin(JsonRpcBatchProvider);
