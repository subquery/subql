// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  StellarHandlerKind,
} from '@subql/common-stellar';
import { retryOnFail } from '@subql/node-core';

export function isBaseHandler(
  handler: SubqlHandler,
): handler is SubqlRuntimeHandler {
  return Object.values<string>(StellarHandlerKind).includes(handler.kind);
}

export function isCustomHandler(
  handler: SubqlHandler,
): handler is SubqlCustomHandler {
  return !isBaseHandler(handler);
}

const handledErrors = ['timeout'];
// eslint-disable-next-line @typescript-eslint/require-await
export async function retryOnFailEth<T>(
  request: () => Promise<T>,
  errors = handledErrors,
): Promise<T> {
  return retryOnFail(request, (e) => !!errors.find((t) => t === e?.reason));
}
