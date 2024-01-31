// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as util from 'util';
import {instanceToPlain} from 'class-transformer';

const BLOCK_UNAVAILBLE_ERROR_MSG = 'Block is unavailable in the chain';

/**
 * Proxy objects aren't serializable between worker threads.
 * VM2 Seems to have objects come out as proxy objects.
 * NOTE do not use this on return types, if used on an entity it would strip all functions and have a plain object
 * */
function unwrapProxy<T = any>(input: T): T {
  // Arrays are not proxy objects but their contents might be. This applies to bulkCreate and bulkUpdate
  if (Array.isArray(input) && input.length && util.types.isProxy(input[0])) {
    return instanceToPlain(input) as T;
  }

  if (!util.types.isProxy(input)) {
    return input;
  }

  return instanceToPlain(input) as T;
}

/* Unwraps any arguments to a function that are proxy objects */
export function unwrapProxyArgs<T extends Array<any>, R>(fn: (...args: T) => R): (...args: T) => R {
  return (...args: T) => fn(...(args.map(unwrapProxy) as T));
}

export class BlockUnavailableError extends Error {
  constructor(message = BLOCK_UNAVAILBLE_ERROR_MSG) {
    super(message);
    Object.setPrototypeOf(this, BlockUnavailableError.prototype);
  }
}
export function isBlockUnavailableError(e: any): e is BlockUnavailableError {
  // When parsing errors through workers, the error doesn't retain its original type
  // Hence, we are using message as a validation too
  return e instanceof BlockUnavailableError || e.message === BLOCK_UNAVAILBLE_ERROR_MSG;
}
