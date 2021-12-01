// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {HttpJsonRpcClient, WsJsonRpcClient} from './client';

export async function getGenesisHash(endpoint: string): Promise<string> {
  const client = endpoint.startsWith('ws') ? new WsJsonRpcClient(endpoint) : new HttpJsonRpcClient(endpoint);
  //const genesisBlock = await client.send<string>('chain_getBlockHash', [0]);  for polka
  const genesisBlock = await client.send<string>('getGenesisHash');
  (client as WsJsonRpcClient).destroy?.();
  return genesisBlock;
}
