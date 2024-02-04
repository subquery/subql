// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import { LocalReader } from '@subql/common';
import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  EthereumHandlerKind,
  SubqlEthereumHandlerKind,
  isCustomDs,
  isRuntimeDs,
} from '@subql/common-ethereum';
import { retryOnFail, updateDataSourcesV1_0_0 } from '@subql/node-core';
import { Reader } from '@subql/types-core';
import { EthereumDatasourceKind, SubqlDatasource } from '@subql/types-ethereum';
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

export async function updateDatasourcesFlare(
  _dataSources: SubqlDatasource[],
  reader: Reader,
  root: string,
): Promise<EthereumProjectDs[]> {
  // Cast to any to make types happy
  const partialUpdate = _dataSources.map((dataSource) => {
    if ((dataSource.kind as string) === 'flare/Runtime') {
      dataSource.kind = EthereumDatasourceKind.Runtime;
    }
    dataSource.mapping.handlers = dataSource.mapping.handlers.map((handler) => {
      switch (handler.kind as string) {
        case 'flare/BlockHandler': {
          handler.kind = EthereumHandlerKind.Block;
          break;
        }
        case 'flare/TransactionHandler': {
          handler.kind = EthereumHandlerKind.Call;
          break;
        }
        case 'flare/LogHandler': {
          handler.kind = EthereumHandlerKind.Event;
          break;
        }
        default:
      }
      return handler;
    });

    return dataSource;
  });

  return updateDataSourcesV1_0_0(partialUpdate, reader, root, isCustomDs);
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
