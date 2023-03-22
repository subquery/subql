// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getLogger } from '@subql/node-core';

const logger = getLogger('connection');

export class ApiPromiseConnection {
  static handleError(e: Error): Error {
    let formatted_error: Error;
    if (e.message.startsWith(`No response received from RPC endpoint in`)) {
      formatted_error = this.handleTimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = this.handleDisconnectionError(e);
    } else {
      formatted_error = e;
    }
    return formatted_error;
  }

  static handleTimeoutError(e: Error): Error {
    const formatted_error = new Error();
    formatted_error.name = 'TimeoutError';
    formatted_error.message = e.message;
    return formatted_error;
  }

  static handleDisconnectionError(e: Error): Error {
    const formatted_error = new Error();
    formatted_error.name = 'ConnectionError';
    formatted_error.message = e.message;
    return formatted_error;
  }
}
