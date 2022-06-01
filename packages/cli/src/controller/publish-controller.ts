// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {ReaderFactory, IPFS_CLUSTER_ENDPOINT} from '@subql/common';
import {parseCosmosProjectManifest} from '@subql/common-cosmos';
import {FileReference} from '@subql/types-cosmos';
import axios from 'axios';
import FormData from 'form-data';
import {IPFSHTTPClient, create} from 'ipfs-http-client';

export async function uploadToIpfs(projectPath: string, authToken: string, ipfsEndpoint?: string): Promise<string> {
  const reader = await ReaderFactory.create(projectPath);
  const schema = await reader.getProjectSchema();
  const manifest = parseCosmosProjectManifest(schema).asImpl;
  let ipfs: IPFSHTTPClient;
  if (ipfsEndpoint) {
    ipfs = create({url: ipfsEndpoint});
  }
  const deployment = await replaceFileReferences(reader.root, manifest, authToken, ipfs);
  // Upload schema
  return uploadFile(deployment.toDeployment(), authToken, ipfs);
}

/* Recursively finds all FileReferences in an object and replaces the files with IPFS references */
async function replaceFileReferences<T>(
  projectDir: string,
  input: T,
  authToken: string,
  ipfs?: IPFSHTTPClient
): Promise<T> {
  if (Array.isArray(input)) {
    return (await Promise.all(
      input.map((val) => replaceFileReferences(projectDir, val, authToken, ipfs))
    )) as unknown as T;
  } else if (typeof input === 'object') {
    if (input instanceof Map) {
      input = mapToObject(input) as T;
    }
    if (isFileReference(input)) {
      input.file = await uploadFile(fs.createReadStream(path.resolve(projectDir, input.file)), authToken, ipfs).then(
        (cid) => `ipfs://${cid}`
      );
    }
    const keys = Object.keys(input) as unknown as (keyof T)[];
    await Promise.all(
      keys.map(async (key) => {
        input[key] = await replaceFileReferences(projectDir, input[key], authToken, ipfs);
      })
    );
  }

  return input;
}

export async function uploadFile(
  content: string | fs.ReadStream,
  authToken: string,
  ipfs?: IPFSHTTPClient
): Promise<string> {
  let ipfsClientCid: string;
  // if user provide ipfs, we will try to upload it to this gateway
  if (ipfs) {
    try {
      ipfsClientCid = (await ipfs.add(content, {pin: true, cidVersion: 0})).cid.toString();
    } catch (e) {
      throw new Error(`Publish project to provided IPFS gateway failed, ${e}`);
    }
  }
  let ipfsClusterCid: string;
  try {
    ipfsClusterCid = await UploadFileByCluster(
      determineStringOrFsStream(content) ? await fs.promises.readFile(content.path, 'utf8') : content,
      authToken
    );
  } catch (e) {
    throw new Error(`Publish project to default cluster failed, ${e}`);
  }
  // Validate IPFS cid
  if (ipfsClientCid && ipfsClientCid !== ipfsClusterCid) {
    throw new Error(`Published and received IPFS cid not identical \n, 
    IPFS gateway: ${ipfsClientCid}, IPFS cluster: ${ipfsClusterCid}`);
  }
  return ipfsClusterCid;
}

function determineStringOrFsStream(toBeDetermined: unknown): toBeDetermined is fs.ReadStream {
  return !!(toBeDetermined as fs.ReadStream).path;
}

async function UploadFileByCluster(content: string, authToken: string): Promise<string> {
  const bodyFormData = new FormData();
  bodyFormData.append('data', content);
  const result = (
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
        ...bodyFormData.getHeaders(),
      },
      method: 'post',
      url: IPFS_CLUSTER_ENDPOINT,
      data: bodyFormData,
    })
  ).data as ClusterResponseData;
  return result.cid?.['/'];
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

interface ClusterResponseData {
  name: string;
  cid: cidSpec;
  size: number;
}
// cluster response cid stored as {'/': 'QmVq2bqunmkmEmMCY3x9U9kDcgoRBGRbuBm5j7XKZDvSYt'}
interface cidSpec {
  '/': string;
}
