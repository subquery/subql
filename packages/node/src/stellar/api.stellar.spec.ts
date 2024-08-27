// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { StellarApi } from './api.stellar';
import { SorobanServer } from './soroban.server';

const HTTP_ENDPOINT = 'https://horizon-futurenet.stellar.org';
const SOROBAN_ENDPOINT = 'https://rpc-futurenet.stellar.org';

jest.setTimeout(60000);

const prepareStellarApi = async function () {
  const soroban = new SorobanServer(SOROBAN_ENDPOINT);
  const api = new StellarApi(HTTP_ENDPOINT, new EventEmitter2(), soroban);
  await api.init();
  return api;
};

describe('StellarApi', () => {
  let stellarApi: StellarApi;

  beforeEach(async () => {
    stellarApi = await prepareStellarApi();
  });

  it('should initialize chainId', () => {
    expect(stellarApi.getChainId()).toEqual(
      'Test SDF Future Network ; October 2022',
    );
  });

  it('should get finalized block height', async () => {
    const height = await stellarApi.getFinalizedBlockHeight();
    expect(height).not.toBeNaN();
    expect(height).toBeGreaterThan(0);
  });

  it('should get best block height', async () => {
    const height = await stellarApi.getBestBlockHeight();
    expect(height).not.toBeNaN();
    expect(height).toBeGreaterThan(0);
  });

  it('should fetch block', async () => {
    const latestHeight = await stellarApi.getFinalizedBlockHeight();
    const block = (await stellarApi.fetchBlocks([latestHeight]))[0];
    expect(block.getHeader().blockHeight).toEqual(latestHeight);
  });

  it('should throw on calling connect', async () => {
    await expect(stellarApi.connect()).rejects.toThrow('Not implemented');
  });

  it('should throw on calling disconnect', async () => {
    await expect(stellarApi.disconnect()).rejects.toThrow('Not implemented');
  });

  it('handleError - pruned node errors', () => {
    const error = new Error('start is before oldest ledger');
    const handled = stellarApi.handleError(error, 1000);
    expect(handled.message).toContain(
      'The requested ledger number 1000 is not available on the current blockchain node',
    );
  });

  it('handleError - non pruned node errors should return the same error', () => {
    const error = new Error('Generic error');
    const handled = stellarApi.handleError(error, 1000);
    expect(handled).toBe(error);
  });

  it('should get runtime chain', () => {
    const runtimeChain = stellarApi.getRuntimeChain();
    expect(runtimeChain).toEqual((stellarApi as any).chainId);
  });

  it('should return chainId for genesis hash', () => {
    const genesisHash = stellarApi.getGenesisHash();
    expect(genesisHash).toEqual(stellarApi.getChainId());
  });

  it('should get spec name', () => {
    const specName = stellarApi.getSpecName();
    expect(specName).toEqual('Stellar');
  });

  it('handleError - soroban node been reset', async () => {
    const error = new Error('start is after newest ledger');
    stellarApi.getAndWrapEvents = jest.fn(() => {
      throw new Error('start is after newest ledger');
    });
    (stellarApi as any).fetchOperationsForLedger = jest.fn((seq: number) => [
      { type: { toString: () => 'invoke_host_function' } },
    ]);
    await expect((stellarApi as any).fetchAndWrapLedger(100)).rejects.toThrow(
      /(Gone|Not Found)/,
    );
  });
});
