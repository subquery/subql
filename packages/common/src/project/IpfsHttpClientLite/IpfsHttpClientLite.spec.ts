// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {u8aConcat} from '@polkadot/util';
import {IPFS_NODE_ENDPOINT, IPFS_WRITE_ENDPOINT} from '../../constants';
import {IPFSHTTPClientLite} from './IPFSHTTPClientLite';

const testAuth = process.env.SUBQL_ACCESS_TOKEN_TEST!;

describe('IPFSClient Lite', () => {
  let readClient: IPFSHTTPClientLite;
  let writeClient: IPFSHTTPClientLite;

  beforeAll(() => {
    readClient = new IPFSHTTPClientLite({url: IPFS_NODE_ENDPOINT});
    writeClient = new IPFSHTTPClientLite({url: IPFS_WRITE_ENDPOINT, headers: {Authorization: `Bearer ${testAuth}`}});
  });

  it('should upload files and yield results', async () => {
    const source = [
      {path: 'mockPath1', content: 'mockContent1'},
      {path: 'mockPath2', content: 'mockContent2'},
    ];

    const results = await writeClient.addAll(source, {pin: true, cidVersion: 0, wrapWithDirectory: false});
    const output: Map<string, string> = new Map();
    for (const result of results) {
      output.set(result.path, result.cid.toString());
    }
    expect(output).toEqual(
      new Map([
        ['mockPath1', 'QmRNDWGxk4N61RGizxNzRbJB5Xkx412JSzRntvFyKVkzHL'],
        ['mockPath2', 'QmNPT2h85L1NsfJiaQoqwkNN132hSdWzdrDUigSh7831Jh'],
      ])
    );
  });

  it('should return file content from IPFS for given CID', async () => {
    const testCID = 'QmQKeYj2UZJoTN5yXSvzJy4A3CjUuSmEWAKeZV4herh5bS';
    const req = readClient.cat(testCID);

    const scriptBufferArray: Uint8Array[] = [];
    for await (const res of req) {
      scriptBufferArray.push(res);
    }
    const output = Buffer.from(u8aConcat(...scriptBufferArray)).toString('utf8');

    expect(output).toBe(`test string to upload`);
  });

  it('should add a file to IPFS and return AddResult', async () => {
    const testContentBuffer = new Uint8Array([1, 2, 3, 4, 5]);
    const testContentStr = `test string to upload`;

    const resultStr = await writeClient.add(testContentStr, {pin: true, cidVersion: 0});
    expect(resultStr.cid.toString()).toBe(`QmQKeYj2UZJoTN5yXSvzJy4A3CjUuSmEWAKeZV4herh5bS`);

    const resultBuffer = await writeClient.add(testContentBuffer, {pin: true, cidVersion: 0});
    expect(resultBuffer.cid.toString()).toBe(`QmUatvHNjq696qkB8SBz5VBytcEeTrM1VwFyy4Rt4Z43mX`);
  });
  //
  it('should pin a content with given CID to a remote pinning service', async () => {
    const testCID = 'QmQKeYj2UZJoTN5yXSvzJy4A3CjUuSmEWAKeZV4herh5bS';
    const result = await writeClient.pinRemoteAdd(testCID, {service: 'onfinality'});
    expect(result.Cid).toBe(testCID);
  });

  it('can cat large file', async () => {
    const testCID = 'Qmab25SoVT4U7YJLFSzt4UXNQpyG9Du2Q7VGDu2b4w2eGr';
    const req = readClient.cat(testCID);
    const scriptBufferArray: Uint8Array[] = [];
    for await (const res of req) {
      scriptBufferArray.push(res);
    }
    const output = Buffer.from(u8aConcat(...scriptBufferArray)).toString('utf8');
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(1);
  }, 500000);
});
