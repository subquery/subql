/* eslint-disable */
import { deepCopy } from '@ethersproject/properties';

import { JsonRpcProvider } from '@ethersproject/providers';
import { Networkish } from '@ethersproject/networks';
import { ConnectionInfo, fetchJson } from './web';
import { getLogger } from '@subql/node-core';

const logger = getLogger('JsonRpcBatchProvider');

interface RpcResult {
  jsonrpc: '2.0';
  id: number;
  result?: string;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Experimental

export class JsonRpcBatchProvider extends JsonRpcProvider {
  _pendingBatchAggregator: NodeJS.Timer;
  _pendingBatch: Array<{
    request: { method: string; params: Array<any>; id: number; jsonrpc: '2.0' };
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }>;

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

    if (this._pendingBatch == null) {
      this._pendingBatch = [];
    }

    const inflightRequest: any = { request, resolve: null, reject: null };

    const promise = new Promise((resolve, reject) => {
      inflightRequest.resolve = resolve;
      inflightRequest.reject = reject;
    });

    this._pendingBatch.push(inflightRequest);

    if (!this._pendingBatchAggregator) {
      // Schedule batch for next event loop + short duration
      this._pendingBatchAggregator = setTimeout(() => {
        this.runRequests();
      }, 1);
    }

    if (this._pendingBatch.length > 10) {
      this.flush();
    }

    return promise;
  }

  flush(): void {
    if (this._pendingBatchAggregator) {
      clearTimeout(this._pendingBatchAggregator);
      this.runRequests();
    }
  }

  private runRequests() {
    // Get teh current batch and clear it, so new requests
    // go into the next batch
    const batch = this._pendingBatch;
    this._pendingBatch = null;
    this._pendingBatchAggregator = null;

    // Get the request as an array of requests
    const request = batch.map((inflight) => inflight.request);

    this.emit('debug', {
      action: 'requestBatch',
      request: deepCopy(request),
      provider: this,
    });

    return fetchJson(this.connection, JSON.stringify(request))
      .then((result: RpcResult[]) => {
        this.emit('debug', {
          action: 'response',
          request: request,
          response: result,
          provider: this,
        });

        // if (!Array.isArray(result)) {
        //   result = [result];
        // }

        // https://github.com/ethers-io/ethers.js/pull/2657
        if (!Array.isArray(result)) {
          const error = new Error(
            'Invalid response \n' + JSON.stringify(result),
          );
          batch.forEach((inflightRequest) => {
            inflightRequest.reject(error);
          });
          return;
        }
        const resultMap = result.reduce((resultMap, payload) => {
          resultMap[payload.id] = payload;
          return resultMap;
        }, {} as Record<number, RpcResult>);

        // For each result, feed it to the correct Promise, depending
        // on whether it was a success or error
        batch.forEach((inflightRequest) => {
          const payload = resultMap[inflightRequest.request.id];
          if (payload.error) {
            const error = new Error(payload.error.message);
            (<any>error).code = payload.error.code;
            (<any>error).data = payload.error.data;
            inflightRequest.reject(error);
          } else {
            inflightRequest.resolve(payload.result);
          }
        });
      })
      .catch((error) => {
        this.emit('debug', {
          action: 'response',
          error: error,
          request: request,
          provider: this,
        });

        logger.error(error);

        batch.forEach((inflightRequest) => {
          inflightRequest.reject(error);
        });
      });
  }
}
