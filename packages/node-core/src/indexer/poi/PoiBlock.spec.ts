// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {PoiBlock} from './PoiBlock';

describe('Poi Block', () => {
  it('create default block, block that has no operation and not been fetched', () => {
    const poiBlock = PoiBlock.create(100, null, null, 'test', new Uint8Array());
    expect(poiBlock.hash).toBeDefined();
  });

  it('chainBlockHash and Operation hash should either both null or both defined, otherwise should throw error', () => {
    expect(() =>
      PoiBlock.create(
        100,
        '0xe1858e5710e2a60caad17505d799baafa8bc58a49bb52b9b9009427e9dc764ee',
        null,
        'test',
        new Uint8Array()
      )
    ).toThrow();
  });

  it('for default block, parentHash must be provided, otherwise should throw', () => {
    expect(() => PoiBlock.create(100, null, null, 'test', undefined)).toThrow();
  });

  it('create new block with operations, and place hold for parent hash and hash', () => {
    const poiBlock = PoiBlock.create(
      1,
      '0xe1858e5710e2a60caad17505d799baafa8bc58a49bb52b9b9009427e9dc764ee',
      new Uint8Array(),
      'test',
      undefined
    );
    expect(poiBlock.hash).toBeUndefined();
    expect(poiBlock.parentHash).toBeUndefined();
    expect(poiBlock.operationHashRoot).toBeDefined();
  });

  it('update existing block with parent hash, it should create its own block hash', () => {
    const poiBlock = PoiBlock.create(
      1,
      '0xe1858e5710e2a60caad17505d799baafa8bc58a49bb52b9b9009427e9dc764ee',
      new Uint8Array(),
      'test',
      new Uint8Array()
    );
    expect(poiBlock.hash).toBeDefined();
    expect(poiBlock.parentHash).toBeDefined();
  });

  it('supports hex block hashes', () => {
    // Shiden
    // https://polkadot.js.org/apps/#/explorer/query/0xe1858e5710e2a60caad17505d799baafa8bc58a49bb52b9b9009427e9dc764ee
    const poiBlock = PoiBlock.create(
      1,
      '0xe1858e5710e2a60caad17505d799baafa8bc58a49bb52b9b9009427e9dc764ee',
      new Uint8Array(),
      'test',
      undefined
    );

    expect(poiBlock.chainBlockHash).toBeDefined();
  });

  it('supports u8a block hashes', () => {
    const hash = new Uint8Array([
      225, 133, 142, 87, 16, 226, 166, 12, 170, 209, 117, 5, 215, 153, 186, 175, 168, 188, 88, 164, 155, 181, 43, 155,
      144, 9, 66, 126, 157, 199, 100, 238,
    ]);
    const poiBlock = PoiBlock.create(1, hash, new Uint8Array(), 'test', new Uint8Array());
    expect(poiBlock.chainBlockHash).toBeDefined();
  });

  it('supports base58 block hashes', () => {
    // https://explorer.near.org/blocks/8gBy5MhHUAg2gVv5Uu9A8mTJF4hpDXteoKykgJiwSFZS
    const poiBlock = PoiBlock.create(
      1,
      '8gBy5MhHUAg2gVv5Uu9A8mTJF4hpDXteoKykgJiwSFZS',
      new Uint8Array(),
      'test',
      new Uint8Array()
    );
    expect(poiBlock.chainBlockHash).toBeDefined();
  });

  it('supports base64 block hashes', () => {
    // https://algoexplorer.io/block/100798
    let poiBlock = PoiBlock.create(
      1,
      'KDG6EJ7FUMNFWZJLHDIJQICOZZ4PORTW5OZPUPRJRGOOM63WQ74A',
      new Uint8Array(),
      'test',
      new Uint8Array()
    );
    expect(poiBlock.chainBlockHash).toBeDefined();

    poiBlock = PoiBlock.create(
      1,
      '7mxLwnp5sElF3ZtZaR2Pe/28+ytwwVNn3hfcQnSurV4=',
      new Uint8Array(),
      'test',
      new Uint8Array()
    );
    expect(poiBlock.chainBlockHash).toBeDefined();

    // https://github.com/polkadot-js/common/issues/1841
    poiBlock = PoiBlock.create(
      1,
      'a1UbyspTdnyZXLUQaQbciCxrCWWxz24kgSwGXSQnkbs=',
      new Uint8Array(),
      'test',
      new Uint8Array()
    );
    expect(poiBlock.chainBlockHash).toBeDefined();
  });

  it('throws on unsupported block hash format', () => {
    expect(() => PoiBlock.create(1, '!@#$%^&', new Uint8Array(), 'test', new Uint8Array())).toThrow();
  });
});
