// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { LocalReader, Reader } from '@subql/common';
import {
  isCustomCosmosDs,
  SubqlCosmosRuntimeHandler,
  SubqlCosmosCustomHandler,
  SubqlCosmosHandler,
  SubqlCosmosHandlerKind,
} from '@subql/common-cosmos';
import {
  loadDataSourceScript,
  updateDataSourcesEntry,
  updateProcessor,
} from '@subql/node-core';
import { SubqlCosmosDatasource } from '@subql/types-cosmos';
import * as protobuf from 'protobufjs';
import {
  SubqlProjectDs,
  CosmosChainType,
  CosmosProjectNetConfig,
} from '../configure/SubqueryProject';

export function isBaseHandler(
  handler: SubqlCosmosHandler,
): handler is SubqlCosmosRuntimeHandler {
  return Object.values<string>(SubqlCosmosHandlerKind).includes(handler.kind);
}

export function isCustomHandler(
  handler: SubqlCosmosHandler,
): handler is SubqlCosmosCustomHandler {
  return !isBaseHandler(handler);
}

export async function processNetworkConfig(
  network: any,
  reader: Reader,
): Promise<CosmosProjectNetConfig> {
  if (network.chainId && network.genesisHash) {
    throw new Error('Please only provide one of chainId and genesisHash');
  } else if (network.genesisHash && !network.chainId) {
    network.chainId = network.genesisHash;
  }
  delete network.genesisHash;

  const chainTypes = new Map<string, CosmosChainType>() as Map<
    string,
    CosmosChainType
  > & { protoRoot: protobuf.Root };
  if (!network.chainTypes) {
    network.chainTypes = chainTypes;
    return network;
  }

  const protoRoot = new protobuf.Root();
  for (const [key, value] of network.chainTypes) {
    const [packageName, proto] = await loadNetworkChainType(reader, value.file);
    chainTypes.set(key, { ...value, packageName, proto });

    protoRoot.add(proto);
  }
  chainTypes.protoRoot = protoRoot;
  network.chainTypes = chainTypes;
  return network;
}

export async function loadNetworkChainType(
  reader: Reader,
  file: string,
): Promise<[string, protobuf.Root]> {
  const proto = await reader.getFile(file);

  if (!proto) throw new Error(`Unable to load chain type from ${file}`);

  const { package: packageName, root } = protobuf.parse(proto);

  return [packageName, root];
}
