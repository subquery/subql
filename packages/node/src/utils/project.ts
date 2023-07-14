// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  SorobanHandlerKind,
  SubqlSorobanHandlerKind,
  isCustomDs,
} from '@subql/common-soroban';
import { retryOnFail } from '@subql/node-core';
import { SubqlProjectDs } from '../configure/SubqueryProject';

export function isBaseHandler(
  handler: SubqlHandler,
): handler is SubqlRuntimeHandler {
  return Object.values<string>(SorobanHandlerKind).includes(handler.kind);
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
      if (handler.kind !== SubqlSorobanHandlerKind.SorobanEvent) {
        return false;
      }
    }
  }

  return true;
}
