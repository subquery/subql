// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from 'eventemitter2';
import { SorobanApi } from './api.soroban';

const HTTP_ENDPOINT = 'https://horizon-futurenet.stellar.org';

const prepareSorobanApi = async function () {
  const api = new SorobanApi(HTTP_ENDPOINT, new EventEmitter2());
  await api.init();
  return api;
};

describe('SorobanApi', () => {
  let sorobanApi: SorobanApi;

  beforeEach(async () => {
    sorobanApi = await prepareSorobanApi();
  });

  it('should initialize chainId', () => {
    expect(sorobanApi.getChainId()).toEqual(
      'Test SDF Future Network ; October 2022',
    );
  });

  it('should get finalized block height', async () => {
    const height = await sorobanApi.getFinalizedBlockHeight();
    expect(height).not.toBeNaN();
    expect(height).toBeGreaterThan(0);
  });

  it('should get best block height', async () => {
    const height = await sorobanApi.getBestBlockHeight();
    expect(height).not.toBeNaN();
    expect(height).toBeGreaterThan(0);
  });

  it('should fetch block', async () => {
    const latestHeight = await sorobanApi.getFinalizedBlockHeight();
    const block = (await sorobanApi.fetchBlocks([latestHeight]))[0];
    expect(block.block.sequence).toEqual(latestHeight);
  });

  it('should throw on calling connect', async () => {
    await expect(sorobanApi.connect()).rejects.toThrow('Not implemented');
  });

  it('should throw on calling disconnect', async () => {
    await expect(sorobanApi.disconnect()).rejects.toThrow('Not implemented');
  });

  it('handleError - pruned node errors', () => {
    const error = new Error('start is before oldest ledger');
    const handled = sorobanApi.handleError(error, 1000);
    expect(handled.message).toContain(
      'The requested ledger number 1000 is not available on the current blockchain node',
    );
  });

  it('handleError - non pruned node errors should return the same error', () => {
    const error = new Error('Generic error');
    const handled = sorobanApi.handleError(error, 1000);
    expect(handled).toBe(error);
  });

  it('should get runtime chain', () => {
    const runtimeChain = sorobanApi.getRuntimeChain();
    expect(runtimeChain).toEqual((sorobanApi as any).name);
  });

  it('should return chainId for genesis hash', () => {
    const genesisHash = sorobanApi.getGenesisHash();
    expect(genesisHash).toEqual(sorobanApi.getChainId());
  });

  it('should get spec name', () => {
    const specName = sorobanApi.getSpecName();
    expect(specName).toEqual('Soroban');
  });
});
