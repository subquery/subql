// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {
  ReaderFactory,
  IPFS_CLUSTER_ENDPOINT,
  getProjectRootAndManifest,
  ProjectRootAndManifest,
  Reader,
} from '@subql/common';
import {parseAlgorandProjectManifest} from '@subql/common-algorand';
import {parseAvalancheProjectManifest} from '@subql/common-avalanche';
import {parseCosmosProjectManifest} from '@subql/common-cosmos';
import {parseEthereumProjectManifest} from '@subql/common-ethereum';
import {parseEthereumProjectManifest as parseFlareProjectManifest} from '@subql/common-flare';
import {parseNearProjectManifest} from '@subql/common-near';
import {parseSubstrateProjectManifest, manifestIsV0_0_1} from '@subql/common-substrate';
import {parseTerraProjectManifest} from '@subql/common-terra';
import {FileReference} from '@subql/types';
import axios from 'axios';
import FormData from 'form-data';
import {IPFSHTTPClient, create} from 'ipfs-http-client';

export async function createIPFSFile(root: string, manifest: string, cid: string): Promise<void> {
  const {name} = path.parse(manifest);
  const MANIFEST_FILE = path.join(root, `.${name}-cid`);
  try {
    await fs.promises.writeFile(MANIFEST_FILE, cid, 'utf8');
  } catch (e) {
    throw new Error(`Failed to create CID file: ${e}`);
  }
}

export async function uploadToIpfs(
  projectPaths: string[],
  authToken: string,
  ipfsEndpoint?: string,
  directory?: string
): Promise<Map<string, string>> {
  const projectToReader: Record<string, Reader> = {};

  await Promise.all(
    projectPaths.map(async (projectPath) => {
      const reader = await ReaderFactory.create(projectPath);
      projectToReader[projectPath] = reader;
    })
  );

  const contents: {path: string; content: string}[] = [];

  let ipfs: IPFSHTTPClient;
  if (ipfsEndpoint) {
    ipfs = create({url: ipfsEndpoint});
  }

  for (const project in projectToReader) {
    const reader = projectToReader[project];
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
                  try {
                    manifest = parseNearProjectManifest(schema).asImpl;
                  } catch (e) {
                    throw new Error('Unable to pass project manifest');
                  }
                }
              }
            }
          }
        }
      }
    }

    const deployment = await replaceFileReferences(reader.root, manifest, authToken, ipfs);
    contents.push({
      path: path.join(directory ?? '', path.basename(project)),
      content: deployment.toDeployment(),
    });
  }

  // Upload schema
  return uploadFile(contents, authToken, ipfs);
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
      const content = fs.readFileSync(path.resolve(projectDir, input.file));
      input.file = await uploadFile([{content: content.toString(), path: ''}], authToken, ipfs).then(
        (fileToCidMap) => `ipfs://${fileToCidMap.get('')}`
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
  contents: {path: string; content: string}[],
  authToken: string,
  ipfs?: IPFSHTTPClient
): Promise<Map<string, string>> {
  const fileCidMap: Map<string, string> = new Map();

  if (ipfs) {
    try {
      const results = ipfs.addAll(contents, {wrapWithDirectory: true});

      for await (const result of results) {
        fileCidMap.set(result.path, result.cid.toString());
      }
    } catch (e) {
      throw new Error(`Publish project to provided IPFS gateway failed, ${e}`);
    }
  }

  for (const content of contents) {
    let ipfsClusterCid: string;

    try {
      if (fileMap.has(content.content)) {
        ipfsClusterCid = fileMap.get(content.content);
      } else {
        ipfsClusterCid = await uploadFileByCluster(content.content, authToken);
        fileMap.set(content.content, ipfsClusterCid);
      }

      fileCidMap.set(content.path, ipfsClusterCid);
    } catch (e) {
      throw new Error(`Publish project to default cluster failed, ${e}`);
    }

    const ipfsClientCid = fileCidMap.get(content.path);
    if (ipfsClientCid && ipfsClientCid !== ipfsClusterCid) {
      throw new Error(`Published and received IPFS cid not identical for ${content.path}\n,
      IPFS gateway: ${ipfsClientCid}, IPFS cluster: ${ipfsClusterCid}`);
    }
  }

  return fileCidMap;
}

function determineStringOrFsStream(toBeDetermined: unknown): toBeDetermined is fs.ReadStream {
  return !!(toBeDetermined as fs.ReadStream).path;
}

async function uploadFileByCluster(content: string, authToken: string): Promise<string> {
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
      maxBodyLength: 50 * 1024 * 1024, //50 MB
      maxContentLength: 50 * 1024 * 1024,
    })
  ).data as ClusterResponseData;

  if (typeof result.cid === 'string') {
    return result.cid;
  }
  const cid = result.cid?.['/'];

  if (!cid) {
    throw new Error('Failed to get CID from response');
  }

  return cid;
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

interface ClusterResponseData {
  name: string;
  cid: CidSpec | string;
  size: number;
}
// cluster response cid stored as {'/': 'QmVq2bqunmkmEmMCY3x9U9kDcgoRBGRbuBm5j7XKZDvSYt'}
interface CidSpec {
  '/': string;
}
