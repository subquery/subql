// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import EventEmitter2 from 'eventemitter2';
import { StellarApi } from './api.stellar';
import SafeStellarProvider from './safe-api';

const HTTP_ENDPOINT = 'https://rpc-futurenet.stellar.org:443';

jest.setTimeout(60000);

const prepareStellarApi = async function () {
  const api = new StellarApi(HTTP_ENDPOINT, new EventEmitter2());
  await api.init();
  return api;
};

describe('StellarApi', function () {
  let stellarApi: StellarApi;

  beforeEach(async function () {
    stellarApi = await prepareStellarApi();
  });

  it('should initialize chainId', function () {
    expect(stellarApi.getChainId()).toEqual(
      'Test SDF Future Network ; October 2022',
    );
  });

  it('should get finalized block height', async function () {
    expect(await stellarApi.getFinalizedBlockHeight()).not.toBeNaN();
  });

  it('should get best block height', async function () {
    expect(await stellarApi.getBestBlockHeight()).not.toBeNaN();
  });

  it('should fetch block', async function () {
    const latestHeight = await stellarApi.getFinalizedBlockHeight();
    const block = (await stellarApi.fetchBlocks([latestHeight]))[0];
    expect(block.block.ledger).toEqual(latestHeight);
  });

  it('throws error if getEvents throws error', async function () {
    jest
      .spyOn(stellarApi, 'getEvents')
      .mockImplementation(() => Promise.reject(new Error('Test error')));
    await expect(stellarApi.fetchBlock(1)).rejects.toThrow('Test error');
  });

  it('should return safe api instance', function () {
    const height = 1;
    const safeApi = stellarApi.getSafeApi(height);
    expect(safeApi).toBeInstanceOf(SafeStellarProvider);
  });

  it('should throw on calling connect', async function () {
    await expect(stellarApi.connect()).rejects.toThrow('Not implemented');
  });

  it('should throw on calling disconnect', async function () {
    await expect(stellarApi.disconnect()).rejects.toThrow('Not implemented');
  });

  it('handleError - pruned node errors', function () {
    const error = new Error('start is before oldest ledger');
    const handled = stellarApi.handleError(error, 1000);
    expect(handled.message).toContain(
      'The requested ledger number 1000 is not available on the current blockchain node',
    );
  });

  it('handleError - non pruned node errors should return the same error', function () {
    const error = new Error('Generic error');
    const handled = stellarApi.handleError(error, 1000);
    expect(handled).toBe(error);
  });

  it('should get runtime chain', function () {
    const runtimeChain = stellarApi.getRuntimeChain();
    expect(runtimeChain).toEqual((stellarApi as any).name);
  });

  it('should return chainId for genesis hash', function () {
    const genesisHash = stellarApi.getGenesisHash();
    expect(genesisHash).toEqual(stellarApi.getChainId());
  });

  it('should get spec name', function () {
    const specName = stellarApi.getSpecName();
    expect(specName).toEqual('Stellar');
  });

  it('should get client for api', function () {
    const apiClient = stellarApi.api;
    expect(apiClient).toEqual((stellarApi as any).client);
  });
});
