// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {ReaderFactory, IPFS_CLUSTER_ENDPOINT, getProjectRootAndManifest} from '@subql/common';
import {parseAlgorandProjectManifest} from '@subql/common-algorand';
import {parseSubstrateProjectManifest as parseAvalancheProjectManifest} from '@subql/common-avalanche';
import {parseCosmosProjectManifest} from '@subql/common-cosmos';
import {parseEthereumProjectManifest} from '@subql/common-ethereum';
import {parseEthereumProjectManifest as parseFlareProjectManifest} from '@subql/common-flare';
import {parseSubstrateProjectManifest, manifestIsV0_0_1} from '@subql/common-substrate';
import {parseTerraProjectManifest} from '@subql/common-terra';
import {FileReference} from '@subql/types';
import {IPFSHTTPClient, create} from 'ipfs-http-client';

export async function createIPFSFile(projectPath: string, cid: string): Promise<void> {
  const filePath = getProjectRootAndManifest(projectPath);
  const {name} = path.parse(filePath.manifest);
  const MANIFEST_FILE = path.join(filePath.root, `.${name}-cid`);
  try {
    await fs.promises.writeFile(MANIFEST_FILE, cid, 'utf8');
  } catch (e) {
    throw new Error(`Failed to create CID file: ${e}`);
  }
}

export async function uploadToIpfs(projectPath: string, authToken: string, ipfsEndpoint?: string): Promise<string> {
  const reader = await ReaderFactory.create(projectPath);
  let manifest;
  const schema = await reader.getProjectSchema();
  //substrate
  try {
    manifest = parseSubstrateProjectManifest(schema).asImpl;
    if (manifestIsV0_0_1(manifest)) {
      throw new Error('Unsupported project manifest spec, only 0.2.0 or greater is supported');
    }
  } catch (e) {
    //terra
    try {
      manifest = parseTerraProjectManifest(schema).asImpl;
    } catch (e) {
      // cosmos
      try {
        manifest = parseCosmosProjectManifest(schema).asImpl;
      } catch (e) {
        //avalanche
        try {
          manifest = parseAvalancheProjectManifest(schema).asImpl;
        } catch (e) {
          // algorand
          try {
            manifest = parseAlgorandProjectManifest(schema).asImpl;
          } catch (e) {
            try {
              manifest = parseEthereumProjectManifest(schema).asImpl;
            } catch (e) {
              try {
                manifest = parseFlareProjectManifest(schema).asImpl;
              } catch (e) {
                throw new Error('Unable to pass project manifest');
              }
            }
          }
        }
      }
    }
  }

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
  } else if (typeof input === 'object' && input !== null) {
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
        // this is the loop
        input[key] = await replaceFileReferences(projectDir, input[key], authToken, ipfs);
      })
    );
  }

  return input;
}

const fileMap = new Map<string | fs.ReadStream, string>();

export async function uploadFile(
  content: string | fs.ReadStream,
  authToken: string,
  ipfs?: IPFSHTTPClient
): Promise<string> {
  let ipfsClientCid: string;
  if (ipfs) {
    try {
      ipfsClientCid = (await ipfs.add(content, {pin: true, cidVersion: 0})).cid.toString();
    } catch (e) {
      throw new Error(`Publish project to provided IPFS gateway failed, ${e}`);
    }
  }
  let ipfsClusterCid: string;
  try {
    if (fileMap.has(content)) {
      ipfsClusterCid = fileMap.get(content);
    } else {
      const ipfsCluster = create({
        url: IPFS_CLUSTER_ENDPOINT,
        headers: {Authorization: `Bearer ${authToken}`},
      });

      ipfsClusterCid = (await ipfsCluster.add(content, {pin: true, cidVersion: 0})).cid.toString();
      fileMap.set(content, ipfsClusterCid);
    }
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

function mapToObject(map: Map<string | number, unknown>): Record<string | number, unknown> {
  // XXX can use Object.entries with newer versions of node.js
  const assetsObj: Record<string, unknown> = {};
  for (const key of map.keys()) {
    assetsObj[key] = map.get(key);
  }
  return assetsObj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isFileReference(value: any): value is FileReference {
  return value?.file && typeof value.file === 'string';
}
