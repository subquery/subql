// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getGenesisHash} from './index';

const WS_ENDPOINT = 'wss://polkadot.api.onfinality.io/public-ws';
const HTTP_ENDPOINT = 'https://polkadot.api.onfinality.io/public';

const GENESIS_HASH = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

describe('test jsonrpc client', () => {
  it("Query polkadot's genesisHash via ws endpoint", async () => {
    const genesisHash = await getGenesisHash(WS_ENDPOINT);
    expect(genesisHash).toEqual(GENESIS_HASH);
  }, 10000);

  it("Query polkadot's genesisHash via http endpoint", async () => {
    const genesisHash = await getGenesisHash(HTTP_ENDPOINT);
    expect(genesisHash).toEqual(GENESIS_HASH);
  });
});
