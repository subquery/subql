// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  EthereumHandlerKind,
  SubqlEthereumHandlerKind,
  isCustomDs,
  isRuntimeDs,
} from '@subql/common-ethereum';
import { retryOnFail } from '@subql/node-core';
import {
  EthereumProjectDs,
  SubqueryProject,
} from '../configure/SubqueryProject';

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

export function onlyHasLogDataSources(
  dataSources: EthereumProjectDs[],
): boolean {
  for (const ds of dataSources) {
    for (const handler of ds.mapping.handlers) {
      if (handler.kind !== SubqlEthereumHandlerKind.EthEvent) {
        return false;
      }
    }
  }

  return true;
}

function dsContainsNonEventHandlers(ds: EthereumProjectDs): boolean {
  if (isRuntimeDs(ds)) {
    return !!ds.mapping.handlers.find(
      (handler) => handler.kind !== EthereumHandlerKind.Event,
    );
  } else if (isCustomDs(ds)) {
    // TODO this can be improved upon in the future.
    return true;
  }
  return true;
}

export function isOnlyEventHandlers(project: SubqueryProject): boolean {
  const hasNonEventHandler = !!project.dataSources.find((ds) =>
    dsContainsNonEventHandlers(ds),
  );
  const hasNonEventTemplate = !!project.templates.find((ds) =>
    dsContainsNonEventHandlers(ds as EthereumProjectDs),
  );

  return !hasNonEventHandler && !hasNonEventTemplate;
}
