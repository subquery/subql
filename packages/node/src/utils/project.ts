// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { LocalReader, Reader } from '@subql/common';
import {
  isCustomDs,
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  EthereumHandlerKind,
  EthereumDatasourceKind,
  SubqlEthereumHandlerKind,
} from '@subql/common-ethereum';
import {
  retryOnFail,
  loadDataSourceScript,
  updateDataSourcesEntry,
  updateProcessor,
} from '@subql/node-core';
import { SubqlDatasource } from '@subql/types-ethereum';
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

export async function updateDataSourcesV1_0_0(
  _dataSources: SubqlDatasource[],
  reader: Reader,
  root: string,
): Promise<SubqlProjectDs[]> {
  // force convert to updated ds
  return Promise.all(
    // Cast to any to make types happy
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

      const entryScript = await loadDataSourceScript(
        reader,
        dataSource.mapping.file,
      );
      const file = await updateDataSourcesEntry(
        reader,
        dataSource.mapping.file,
        root,
        entryScript,
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
      if (isCustomDs(dataSource)) {
        if (dataSource.processor) {
          dataSource.processor.file = await updateProcessor(
            reader,
            root,
            dataSource.processor.file,
          );
        }
        if (dataSource.assets) {
          for (const [, asset] of dataSource.assets) {
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
        return {
          ...dataSource,
          mapping: { ...dataSource.mapping, entryScript, file },
        };
      } else {
        return {
          ...dataSource,
          mapping: { ...dataSource.mapping, entryScript, file },
        };
      }
    }),
  );
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
