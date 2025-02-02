// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export enum ApiErrorType {
  Timeout = 'timeout',
  Connection = 'connection',
  RateLimit = 'ratelimit',
  Default = 'default',
}

export class ApiConnectionError extends Error {
  errorType: ApiErrorType;

  constructor(name: string, message: string, errorType: ApiErrorType) {
    super(message);
    this.name = name;
    this.errorType = errorType;
  }
}

export class RateLimitError extends ApiConnectionError {
  constructor(e: Error) {
    super('RateLimit', e.message, ApiErrorType.RateLimit);
  }
}

export class TimeoutError extends ApiConnectionError {
  constructor(e: Error) {
    super('TimeoutError', e.message, ApiErrorType.Timeout);
  }
}

export class DisconnectionError extends ApiConnectionError {
  constructor(e: Error) {
    super('ConnectionError', e.message, ApiErrorType.Connection);
  }
}

export class LargeResponseError extends ApiConnectionError {
  constructor(e: Error) {
    const newMessage = `Oversized RPC node response. This issue is related to the network's RPC nodes configuration, not your application. You may report it to the network's maintainers or try a different RPC node.\n\n${e.message}`;

    super('RpcInternalError', newMessage, ApiErrorType.Default);
  }
}

export class MetadataMismatchError extends Error {
  constructor(metadata: string, expected: string, actual: string) {
    super(
      `Value of ${metadata} does not match across all endpoints\n
       Expected: ${expected}
       Actual: ${actual}`
    );
  }
}
