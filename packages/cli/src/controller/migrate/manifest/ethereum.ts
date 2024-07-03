// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FileReference} from '@subql/types-core';
import type {
  SubqlRuntimeDatasource as EthereumDs,
  CustomDatasourceTemplate as EthereumCustomDsTemplate,
  RuntimeDatasourceTemplate as EthereumDsTemplate,
  EthereumDatasourceKind,
  EthereumHandlerKind,
} from '@subql/types-ethereum';
import {DEFAULT_HANDLER_BUILD_PATH} from '../../generate-controller';
import {MigrateDatasourceKind, SubgraphDataSource, SubgraphTemplate} from '../types';

type EthTemplate = EthereumDsTemplate | EthereumCustomDsTemplate;

function baseDsConversion<D extends EthereumDs | EthTemplate>(
  ds: SubgraphDataSource | SubgraphTemplate
): MigrateDatasourceKind<D> {
  const assets: Map<string, FileReference> = new Map();
  for (const abi of ds.mapping.abis) {
    assets.set(abi.name, {file: abi.file});
  }

  const subqlDs = {
    kind: 'ethereum/Runtime' as EthereumDatasourceKind.Runtime,
    migrateDatasourceType: 'EthereumDatasourceKind.Runtime',
    assets: new Map(ds.mapping.abis.map((a) => [a.name, {file: a.file}])),
    mapping: {
      file: DEFAULT_HANDLER_BUILD_PATH,
      handlers: [
        ...(ds.mapping.blockHandlers ?? []).map((h) => {
          return {
            kind: 'ethereum/Runtime' as EthereumHandlerKind.Block,
            migrateHandlerType: 'EthereumHandlerKind.Block',
            handler: h.handler,
            filter: undefined,
          };
        }),
        ...(ds.mapping.eventHandlers ?? []).map((h) => {
          return {
            kind: 'ethereum/LogHandler' as EthereumHandlerKind.Event,
            migrateHandlerType: 'EthereumHandlerKind.Event',
            handler: h.handler,
            filter: {
              topics: [h.event],
            },
          };
        }),
        ...(ds.mapping.callHandlers ?? []).map((h) => {
          return {
            kind: 'ethereum/TransactionHandler' as EthereumHandlerKind.Call,
            migrateHandlerType: 'EthereumHandlerKind.Call',
            handler: h.handler,
            filter: {
              f: h.function,
            },
          };
        }),
      ],
    },
  } as unknown as MigrateDatasourceKind<D>;
  return subqlDs;
}

export function convertEthereumDs(ds: SubgraphDataSource): MigrateDatasourceKind<EthereumDs> {
  const subqlDs = baseDsConversion<EthereumDs>(ds);
  subqlDs.startBlock = ds.source.startBlock;
  subqlDs.endBlock = ds.source.endBlock;
  subqlDs.options = {abi: ds.source.abi, address: ds.source.address};
  return subqlDs;
}

export function convertEthereumTemplate(ds: SubgraphTemplate): MigrateDatasourceKind<EthTemplate> {
  const subqlTemplate = baseDsConversion<EthTemplate>(ds);
  subqlTemplate.options = {abi: ds.source.abi};
  subqlTemplate.name = ds.name;
  return subqlTemplate;
}
