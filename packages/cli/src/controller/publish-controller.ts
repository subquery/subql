// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {Cluster} from '@nftstorage/ipfs-cluster';
import {parseProjectManifest, ReaderFactory, manifestIsV0_2_0} from '@subql/common';
import {FileReference} from '@subql/types';
import fetch from '@web-std/fetch';
import {File, Blob} from '@web-std/file';
import {FormData} from '@web-std/form-data';
import IPFS, {IPFSHTTPClient} from 'ipfs-http-client';
Object.assign(global, {fetch, File, Blob, FormData});

const IPFS_DEV = 'https://interipfs.thechaindata.com';
const IPFS_PROD = 'https://ipfs.subquery.network';
const IPFS_CLUSTER_ENDPOINT = `${IPFS_DEV}/cluster/add`;

export async function uploadToIpfs(projectDir: string, authToken: string, ipfsEndpoint?: string): Promise<string> {
  const reader = await ReaderFactory.create(projectDir);
  const manifest = parseProjectManifest(await reader.getProjectSchema()).asImpl;

  if (!manifestIsV0_2_0(manifest)) {
    throw new Error('Unsupported project manifest spec, only 0.2.0 is supported');
  }
  let ipfs: IPFSHTTPClient;
  if (ipfsEndpoint) {
    ipfs = IPFS.create({url: ipfsEndpoint});
  }
  const cluster = new Cluster(IPFS_CLUSTER_ENDPOINT, {
    // optional custom headers for e.g. auth
    headers: {Authorization: `Bearer ${authToken}`},
  });
  const deployment = await replaceFileReferences(projectDir, manifest, cluster, ipfs);

  // Upload schema
  return uploadFile(deployment.toDeployment(), cluster, ipfs);
}

/* Recursively finds all FileReferences in an object and replaces the files with IPFS references */
async function replaceFileReferences<T>(
  projectDir: string,
  input: T,
  cluster: Cluster,
  ipfs?: IPFS.IPFSHTTPClient
): Promise<T> {
  if (Array.isArray(input)) {
    return (await Promise.all(
      input.map((val) => replaceFileReferences(projectDir, val, cluster, ipfs))
    )) as unknown as T;
  } else if (typeof input === 'object') {
    if (input instanceof Map) {
      input = mapToObject(input) as T;
    }

    if (isFileReference(input)) {
      input.file = await uploadFile(fs.createReadStream(path.resolve(projectDir, input.file)), cluster, ipfs).then(
        (cid) => `ipfs://${cid}`
      );
    }

    const keys = Object.keys(input) as unknown as (keyof T)[];
    await Promise.all(
      keys.map(async (key) => {
        input[key] = await replaceFileReferences(projectDir, input[key], cluster, ipfs);
      })
    );
  }

  return input;
}

export async function uploadFile(
  content: string | fs.ReadStream,
  cluster: Cluster,
  ipfs?: IPFS.IPFSHTTPClient
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
  // convert content to blob
  let contentBuffer: Uint8Array;
  if (determineStringOrFsStream(content)) {
    contentBuffer = new Blob([fs.readFileSync(content.path)]);
  } else {
    contentBuffer = new Blob([content]);
  }
  // upload to subquery ipfs cluster
  let ipfsClusterCid: string;
  try {
    ipfsClusterCid = (await cluster.add(contentBuffer, {cidVersion: 0, rawLeaves: false})).cid;
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
