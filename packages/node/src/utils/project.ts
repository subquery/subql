// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  StellarHandlerKind,
  isCustomDs,
} from '@subql/common-stellar';
import { retryOnFail } from '@subql/node-core';
import { SubqlProjectDs } from '../configure/SubqueryProject';

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

export function onlyHasEventDataSources(
  dataSources: SubqlProjectDs[],
): boolean {
  for (const ds of dataSources) {
    for (const handler of ds.mapping.handlers) {
      if (handler.kind !== StellarHandlerKind.Event) {
        return false;
      }
    }
  }

  return true;
}
