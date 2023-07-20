// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {HttpJsonRpcClient, WsJsonRpcClient} from './client';

export async function getGenesisHash(endpoint: string): Promise<string> {
  const client = endpoint.startsWith('ws') ? new WsJsonRpcClient(endpoint) : new HttpJsonRpcClient(endpoint);
  const genesisBlock = await client.send<string>('chain_getBlockHash', [0]);
  (client as WsJsonRpcClient).destroy?.();
  return genesisBlock;
}
