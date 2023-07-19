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
  private batchSize = 1;
  private successfulBatchCount = 0;
  private failedBatchCount = 0;
  private batchSizeAdjustmentInterval = 10; // Adjust batch size after every 10 batches

  _pendingBatchAggregator: NodeJS.Timer;
  _pendingBatch: Array<{
    request: { method: string; params: Array<any>; id: number; jsonrpc: '2.0' };
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }>;

  _chainIdCache: string | null = null;

  constructor(url: string | ConnectionInfo, network?: Networkish) {
    super(url, network);
  }

  setBatchSize(batchSize: number) {
    this.batchSize = batchSize;
  }

  send(method: string, params: Array<any>): Promise<any> {
    if (method === 'eth_chainId' && this._chainIdCache !== null) {
      return Promise.resolve(this._chainIdCache);
    }

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

    if (this._pendingBatch.length > this.batchSize) {
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
          if (
            (result as RpcResult).error?.message === 'Batch size is too large'
          ) {
            this.adjustBatchSize(false);
          }
          return;
        }

        // BSC returns a 200 response with this when being rate limited, we need a special case for it
        /*
           [
              {
                jsonrpc: '2.0',
                id: null,
                error: {
                  code: -32005,
                  message: 'method eth_getLogs in batch triggered rate limit'
                }
              }
            ]
        */
        if (result.length === 1 && result[0].id === null) {
          batch.forEach((inflightRequest) => {
            inflightRequest.reject(new Error(result[0].error?.message));
          });
          this.adjustBatchSize(false);
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
          if (!payload) {
            inflightRequest.reject(
              new Error(
                `Missing payload in response for request ${inflightRequest.request.id}`,
              ),
            );
          } else if (payload.error) {
            const error = new Error(payload.error.message);
            (<any>error).code = payload.error.code;
            (<any>error).data = payload.error.data;
            if (
              payload.error.message === 'Batch size limit exceeded' || // onfinality
              payload.error.message === 'exceeded project rate limit' || // infura
              payload.error.message.includes(
                'Failed to buffer the request body',
              ) ||
              payload.error.message.includes('Too Many Requests') ||
              payload.error.message.includes('Request Entity Too Large')
            ) {
              this.adjustBatchSize(false);
            }
            inflightRequest.reject(error);
          } else {
            if (inflightRequest.request.method === 'eth_chainId') {
              this._chainIdCache = payload.result;
            }
            inflightRequest.resolve(payload.result);
          }
        });

        this.adjustBatchSize(true);
      })
      .catch((error) => {
        this.emit('debug', {
          action: 'response',
          error: error,
          request: request,
          provider: this,
        });

        //logger.error(error);

        batch.forEach((inflightRequest) => {
          inflightRequest.reject(error);
        });

        //this.adjustBatchSize(false);
      });
  }

  private adjustBatchSize(success: boolean) {
    success ? this.successfulBatchCount++ : this.failedBatchCount++;
    const totalBatches = this.successfulBatchCount + this.failedBatchCount;

    if (totalBatches % this.batchSizeAdjustmentInterval === 0) {
      const successRate = this.successfulBatchCount / totalBatches;

      // Adjust the batch size based on the success rate.
      if (successRate < 0.9 && this.batchSize > 1) {
        this.batchSize--;
      } else if (successRate > 0.95 && this.batchSize < 10) {
        this.batchSize++;
      }

      // Reset the counters
      this.successfulBatchCount = 0;
      this.failedBatchCount = 0;
    }
  }
}
