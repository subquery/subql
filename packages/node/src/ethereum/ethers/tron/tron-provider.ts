// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Networkish } from '@ethersproject/networks';
import { WebSocketProvider } from '@ethersproject/providers';
import { JsonRpcBatchProvider } from '../json-rpc-batch-provider';
import { JsonRpcProvider } from '../json-rpc-provider';
import { ConnectionInfo } from '../web';
import { applyTronParamTransforms } from './tron-utils';

/**
 * Tron-specific JsonRpcProvider that applies parameter transformations
 * to handle Tron RPC limitations.
 */
export class TronJsonRpcProvider extends JsonRpcProvider {
  constructor(url: string | ConnectionInfo, network?: Networkish) {
    super(url, network);
  }

  async send(method: string, params: Array<any>): Promise<any> {
    const chainId = this.network?.chainId ?? 0;
    const cleanedParams = applyTronParamTransforms(method, params, chainId);
    return super.send(method, cleanedParams);
  }
}

/**
 * Tron-specific JsonRpcBatchProvider that applies parameter transformations
 * to handle Tron RPC limitations.
 */
export class TronJsonRpcBatchProvider extends JsonRpcBatchProvider {
  constructor(url: string | ConnectionInfo, network?: Networkish) {
    super(url, network);
  }

  async send(method: string, params: Array<any>): Promise<any> {
    const chainId = this.network?.chainId ?? 0;
    const cleanedParams = applyTronParamTransforms(method, params, chainId);
    return super.send(method, cleanedParams);
  }
}

/**
 * Tron-specific WebSocketProvider that applies parameter transformations
 * to handle Tron RPC limitations.
 */
export class TronWsProvider extends WebSocketProvider {
  constructor(url: string, network?: Networkish) {
    super(url, network);
  }

  async send(method: string, params: Array<any>): Promise<any> {
    const chainId = this.network?.chainId ?? 0;
    const cleanedParams = applyTronParamTransforms(method, params, chainId);
    return super.send(method, cleanedParams);
  }
}
