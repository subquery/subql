// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import { LocalReader, Reader } from '@subql/common';
import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  EthereumHandlerKind,
  SubqlEthereumHandlerKind,
  isCustomDs,
} from '@subql/common-ethereum';
import { retryOnFail, updateDataSourcesV1_0_0 } from '@subql/node-core';
import { EthereumDatasourceKind, SubqlDatasource } from '@subql/types-ethereum';
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

export async function updateDatasourcesFlare(
  _dataSources: SubqlDatasource[],
  reader: Reader,
  root: string,
): Promise<SubqlProjectDs[]> {
  // Cast to any to make types happy
  const partialUpdate = await Promise.all(
    _dataSources.map(async (dataSource) => {
      if ((dataSource.kind as string) === 'flare/Runtime') {
        dataSource.kind = EthereumDatasourceKind.Runtime;
      }
      dataSource.mapping.handlers = dataSource.mapping.handlers.map(
        (handler) => {
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
        },
      );

      if (dataSource.assets) {
        for (const [, asset] of Object.entries(dataSource.assets)) {
          if (reader instanceof LocalReader) {
            asset.file = path.resolve(root, asset.file);
          } else {
            const res = await reader.getFile(asset.file);
            const outputPath = path.resolve(
              root,
              asset.file.replace('ipfs://', ''),
            );
            await fs.promises.writeFile(outputPath, res as string);
            asset.file = outputPath;
          }
        }
      }

      return dataSource;
    }),
  );

  return updateDataSourcesV1_0_0(partialUpdate, reader, root, isCustomDs);
}
