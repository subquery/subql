// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EthereumDatasourceKind, EthereumHandlerKind} from '@subql/common-ethereum';
import {FileReference} from '@subql/types-core';
import {
  RuntimeDatasourceTemplate as EthTemplate,
  SubqlBlockHandler as EthereumBlockHandler,
  SubqlCallHandler as EthereumCallHandler,
  SubqlEventHandler as EthereumEventHandler,
  SubqlRuntimeDatasource as EthereumDs,
} from '@subql/types-ethereum/dist/project';
import {SubgraphDataSource, SubgraphTemplate} from '../../../types';
import {DEFAULT_HANDLER_BUILD_PATH} from '../../generate-controller';

function baseDsConversion(ds: SubgraphDataSource | SubgraphTemplate): EthereumDs | EthTemplate {
  const assets: Map<string, FileReference> = new Map();
  for (const abi of ds.mapping.abis) {
    assets.set(abi.name, {file: abi.file});
  }

  const subqlDs: EthereumDs | EthTemplate = {
    kind: EthereumDatasourceKind.Runtime,
    assets: new Map(ds.mapping.abis.map((a) => [a.name, {file: a.file}])),
    mapping: {
      file: DEFAULT_HANDLER_BUILD_PATH,
      handlers: [
        ...((ds.mapping.blockHandlers
          ? ds.mapping.blockHandlers.map((h) => {
              return {
                handler: h.handler,
              };
            })
          : []) as EthereumBlockHandler[]),
        ...((ds.mapping.eventHandlers
          ? ds.mapping.eventHandlers.map((h) => {
              return {
                kind: EthereumHandlerKind.Event,
                handler: h.handler,
                filter: {
                  topics: [h.event],
                },
              };
            })
          : []) as EthereumEventHandler[]),
        ...((ds.mapping.callHandlers
          ? ds.mapping.callHandlers.map((h) => {
              return {
                kind: EthereumHandlerKind.Call,
                handler: h.handler,
                filter: {
                  f: h.function,
                },
              };
            })
          : []) as EthereumCallHandler[]),
      ],
    },
  };
  return subqlDs;
}

export function convertEthereumDs(ds: SubgraphDataSource): EthereumDs {
  const subqlDs = baseDsConversion(ds) as EthereumDs;
  subqlDs.startBlock = ds.source.startBlock;
  subqlDs.options = {abi: ds.source.abi, address: ds.source.address};
  return subqlDs;
}

export function convertEthereumTemplate(ds: SubgraphTemplate): EthTemplate {
  const subqlTemplate = baseDsConversion(ds) as EthTemplate;
  subqlTemplate.options = {abi: ds.source.abi};
  return subqlTemplate;
}
