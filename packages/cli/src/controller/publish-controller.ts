// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { parseProjectManifest, manifestIsV0_2_0, ReaderFactory } from '@subql/common';
import {FileReference} from '@subql/types';
import IPFS from 'ipfs-http-client';

// https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#filecontent
type FileContent = Uint8Array | string | Iterable<Uint8Array> | Iterable<number> | AsyncIterable<Uint8Array>;

// https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#fileobject
type FileObject = {
  path?: string;
  content?: FileContent;
  mode?: number | string;
  mtime?: Date | number[] | {secs: number; nsecs?: number};
};

export async function uploadToIpfs(ipfsEndpoint: string, projectDir: string): Promise<string> {
  const ipfs = IPFS.create({url: ipfsEndpoint});

  const reader = await ReaderFactory.create(projectDir);
  const manifest = parseProjectManifest(await reader.getProjectSchema()).asImpl;

  if (!manifestIsV0_2_0(manifest)) {
    throw new Error('Unsupported project manifest spec, only 0.2.0 is supported');
  }

  const deployment = await replaceFileReferences(ipfs, projectDir, manifest);

  // Upload schema
  return uploadFile(ipfs, deployment.toDeployment());
}

/* Recursively finds all FileReferences in an object and replaces the files with IPFS references */
async function replaceFileReferences<T>(ipfs: IPFS.IPFSHTTPClient, projectDir: string, input: T): Promise<T> {
  if (Array.isArray(input)) {
    return (await Promise.all(input.map((val) => replaceFileReferences(ipfs, projectDir, val)))) as unknown as T;
  } else if (typeof input === 'object') {
    if (input instanceof Map) {
      input = mapToObject(input) as T;
    }

    if (isFileReference(input)) {
      input.file = await uploadFile(ipfs, fs.createReadStream(path.resolve(projectDir, input.file))).then(
        (cid) => `ipfs://${cid}`
      );
    }

    const keys = Object.keys(input) as unknown as (keyof T)[];
    await Promise.all(
      keys.map(async (key) => {
        input[key] = await replaceFileReferences(ipfs, projectDir, input[key]);
      })
    );
  }

  return input;
}

async function uploadFile(ipfs: IPFS.IPFSHTTPClient, content: FileObject | FileContent): Promise<string> {
  const result = await ipfs.add(content, {pin: true, cidVersion: 0});
  return result.cid.toString();
}

function mapToObject(map: Map<string | number, unknown>): Record<string | number, unknown> {
  // XXX can use Object.entries with newer versions of node.js
  const assetsObj: Record<string, unknown> = {};
  for (const key of map.keys()) {
    assetsObj[key] = map.get(key);
  }

  return assetsObj;
}

function isFileReference(value: any): value is FileReference {
  return value.file && typeof value.file === 'string';
}
