// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {u8aConcat} from '@polkadot/util';
import {create, IPFSHTTPClient} from 'ipfs-http-client';
import {IPFS_NODE_ENDPOINT, IPFS_WRITE_ENDPOINT} from '../../constants';
import {IPFSHTTPClientLite} from './IPFSHTTPClientLite';

const testAuth = process.env.SUBQL_ACCESS_TOKEN!;

describe('SubIPFSClient', () => {
  let readClient: IPFSHTTPClientLite;
  let writeClient: IPFSHTTPClientLite;
  let originalWriteClient: IPFSHTTPClient;

  beforeAll(() => {
    readClient = new IPFSHTTPClientLite({url: IPFS_NODE_ENDPOINT});
    writeClient = new IPFSHTTPClientLite({url: IPFS_WRITE_ENDPOINT, headers: {Authorization: `Bearer ${testAuth}`}});
    originalWriteClient = create({
      url: IPFS_WRITE_ENDPOINT,
      headers: {Authorization: `Bearer ${testAuth}`},
    });
  });

  it('should upload files and yield results', async () => {
    const source = [
      {path: 'mockPath1', content: 'mockContent1'},
      {path: 'mockPath2', content: 'mockContent2'},
    ];

    const originalOutput: Map<string, string> = new Map();
    const originalResults = originalWriteClient.addAll(source, {pin: true, cidVersion: 0, wrapWithDirectory: false});
    for await (const result of originalResults) {
      originalOutput.set(result.path, result.cid.toString());
    }
    const results = await writeClient.addAll(source, {pin: true, cidVersion: 0, wrapWithDirectory: false});
    const output: Map<string, string> = new Map();
    for (const result of results) {
      output.set(result.path, result.cid.toString());
    }
    expect(originalOutput).toEqual(output);
  });

  it('should return file content from IPFS for given CID', async () => {
    const testCID = 'QmNbkA1fJpV2gCAWCBjgUQ8xBTwkLZHuzx4EkUoKx7VYaD';
    const req = readClient.cat(testCID);

    const scriptBufferArray: Uint8Array[] = [];
    for await (const res of req) {
      scriptBufferArray.push(res);
    }
    const output = Buffer.from(u8aConcat(...scriptBufferArray)).toString('utf8');

    console.log(output);
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
});

describe('Original IPFS Client', () => {
  const ipfsWrite = create({
    url: IPFS_WRITE_ENDPOINT,
    headers: {Authorization: `Bearer ${testAuth}`},
  });

  it('Upload multiple files to IPFS', async () => {
    const source = [
      {path: 'mockPath1', content: 'mockContent1'},
      {path: 'mockPath2', content: 'mockContent2'},
    ];

    const output: Map<string, string> = new Map();
    const results = ipfsWrite.addAll(source, {pin: true, cidVersion: 0, wrapWithDirectory: false});
    for await (const result of results) {
      output.set(result.path, result.cid.toString());
    }
    console.log(output);
  });
});
