// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  EthereumHandlerKind,
  SubqlEthereumHandlerKind,
} from '@subql/common-ethereum';
import { retryOnFail } from '@subql/node-core';
import { SubqlProjectDs } from '../configure/SubqueryProject';

export function isBaseHandler(
  handler: SubqlHandler,
): handler is SubqlRuntimeHandler {
  return Object.values<string>(EthereumHandlerKind).includes(handler.kind);
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

export function onlyHasLogDataSources(dataSources: SubqlProjectDs[]): boolean {
  for (const ds of dataSources) {
    for (const handler of ds.mapping.handlers) {
      if (
        handler.kind !== SubqlEthereumHandlerKind.EthEvent &&
        handler.kind !== SubqlEthereumHandlerKind.FlareEvent
      ) {
        return false;
      }
    }
  }

  return true;
}
