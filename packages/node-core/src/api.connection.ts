// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IApi} from './api.service';
import {NetworkMetadataPayload} from './events';
import {ApiConnectionError, ApiErrorType} from './indexer';

export interface IApiConnectionSpecific<A = any, SA = any, B = any> extends IApi<A, SA, B> {
  handleError(error: Error): ApiConnectionError;
  apiConnect(): Promise<void>;
  apiDisconnect(): Promise<void>;
}

export abstract class ApiConnectionSpecific<A = any, SA = any, B = any> implements IApiConnectionSpecific<A, SA, B> {
  abstract fetchBlocks(heights: number[], ...args: any): Promise<B[]>;
  abstract safeApi(height: number): SA;
  abstract unsafeApi: A;
  abstract networkMeta: NetworkMetadataPayload;
  abstract handleError(error: Error): ApiConnectionError;
  abstract apiConnect(): Promise<void>;
  abstract apiDisconnect(): Promise<void>;

  static handleRateLimitError(e: Error): ApiConnectionError {
    const formatted_error = new ApiConnectionError('RateLimit', e.message, ApiErrorType.RateLimit);
    return formatted_error;
  }

  static handleTimeoutError(e: Error): ApiConnectionError {
    const formatted_error = new ApiConnectionError('TimeoutError', e.message, ApiErrorType.Timeout);
    return formatted_error;
  }

  static handleDisconnectionError(e: Error): ApiConnectionError {
    const formatted_error = new ApiConnectionError('ConnectionError', e.message, ApiErrorType.Connection);
    return formatted_error;
  }

  static handleLargeResponseError(e: Error): ApiConnectionError {
    const newMessage = `Oversized RPC node response. This issue is related to the network's RPC nodes configuration, not your application. You may report it to the network's maintainers or try a different RPC node.\n\n${e.message}`;

    return new ApiConnectionError('RpcInternalError', newMessage, ApiErrorType.Default);
  }
}
