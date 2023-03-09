/* eslint-disable */
import { deepCopy } from '@ethersproject/properties';
import { fetchJson } from '@ethersproject/web';

import { JsonRpcProvider as BaseJsonRpcProvider } from '@ethersproject/providers';
import { Networkish } from '@ethersproject/networks';
import { ConnectionInfo } from './web';

function getResult(payload: {
  error?: { code?: number; data?: any; message?: string };
  result?: any;
}): any {
  if (payload.error) {
    // @TODO: not any
    const error: any = new Error(payload.error.message);
    error.code = payload.error.code;
    error.data = payload.error.data;
    throw error;
  }

  return payload.result;
}

export class JsonRpcProvider extends BaseJsonRpcProvider {
  constructor(url: string | ConnectionInfo, network?: Networkish) {
    super(url, network);
  }

  send(method: string, params: Array<any>): Promise<any> {
    const request = {
      method: method,
      params: params,
      id: this._nextId++,
      jsonrpc: '2.0',
    };

    this.emit('debug', {
      action: 'request',
      request: deepCopy(request),
      provider: this,
    });

    // We can expand this in the future to any call, but for now these
    // are the biggest wins and do not require any serializing parameters.
    const cache = ['eth_chainId', 'eth_blockNumber'].indexOf(method) >= 0;
    if (cache && this._cache[method]) {
      return this._cache[method];
    }

    const result = fetchJson(
      this.connection,
      JSON.stringify(request),
      getResult,
    ).then(
      (result) => {
        this.emit('debug', {
          action: 'response',
          request: request,
          response: result,
          provider: this,
        });

        return result;
      },
      (error) => {
        this.emit('debug', {
          action: 'response',
          error: error,
          request: request,
          provider: this,
        });

        throw error;
      },
    );

    // Cache the fetch, but clear it on the next event loop
    if (cache) {
      this._cache[method] = result;
      setTimeout(() => {
        this._cache[method] = null;
      }, 0);
    }

    return result;
  }
}
