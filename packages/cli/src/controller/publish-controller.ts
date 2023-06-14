// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {Readable} from 'stream';
import {ReaderFactory, IPFS_CLUSTER_ENDPOINT, Reader} from '@subql/common';
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

  let ipfsClusterContent;
  try {
    ipfsClusterContent = await uploadFileByCluster(contents, authToken);
  } catch (e) {
    throw new Error(`Publish project to default cluster failed, ${e}`);
  }

  ipfsClusterContent.map((clusterContent) => {
    const clientCid = fileMap.get(clusterContent.content);
    if (clientCid !== clusterContent.cid) {
      throw new Error(`Published and received IPFS cid not identical for ${clusterContent.name}\n,
      IPFS gateway: ${clientCid}, IPFS cluster: ${clusterContent.cid}`);
    }

    fileCidMap.set(clusterContent.name, clusterContent.cid);
  });

  return fileCidMap;
}

function determineStringOrFsStream(toBeDetermined: unknown): toBeDetermined is fs.ReadStream {
  return !!(toBeDetermined as fs.ReadStream).path;
}

async function uploadFileByCluster(
  content: {path: string; content: string}[],
  authToken: string
): Promise<{name: string; content: string; cid: string}[]> {
  // Determine the endpoint based on the number of content items
  const endpoint = content.length > 1 ? `${IPFS_CLUSTER_ENDPOINT}?wrap-with-directory=true` : IPFS_CLUSTER_ENDPOINT;

  // Identify new files not present in the fileMap
  const newFiles = content.filter((ct) => !fileMap.has(ct.content));

  // If all content is available in fileMap, return the results using existing CIDs
  if (newFiles.length === 0) {
    return content.map((ct) => ({name: ct.path, content: ct.content, cid: fileMap.get(ct.content) as string}));
  }

  // Create FormData and append new files
  const bodyFormData = new FormData();
  newFiles.forEach((ct) => bodyFormData.append('file', Readable.from(ct.content), {filepath: ct.path}));

  // Perform the axios request to upload files
  const result = await axios.post(endpoint, bodyFormData, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'multipart/form-data',
      ...bodyFormData.getHeaders(),
    },
    maxBodyLength: 50 * 1024 * 1024, // 50 MB
    maxContentLength: 50 * 1024 * 1024,
  });

  // Parse the axios response
  let parsedResult;
  if (typeof result.data === 'string') {
    parsedResult = result.data.split(/\r?\n/).reduce((accumulator, res) => {
      if (res !== '') {
        accumulator.push(JSON.parse(res));
      }
      return accumulator;
    }, []);
  } else {
    parsedResult = Array.isArray(result.data) ? result.data : [result.data];
  }

  // Process the parsed result to obtain the uploaded files data
  const uploadedFiles = parsedResult.map((res) => {
    // Extract the CID from the response
    const cid = res.cid?.['/'] || res.cid;
    if (!cid) throw new Error('Failed to get CID from IPFS response');

    // Find the corresponding content item for the uploaded file
    const ct = content.find((ct) => ct.path === res.name);

    // Create the file data object for the uploaded file
    const fileData = ct
      ? {name: ct.path, content: ct.content, cid: cid.toString()}
      : {name: res.name, content: res.name, cid: cid.toString()};

    // Update the fileMap with the new CID
    fileMap.set(fileData.content, fileData.cid);

    return fileData;
  });

  // Include the CIDs from the fileMap for the files that were not uploaded in this request
  const existingFiles = content
    .filter((ct) => !newFiles.includes(ct))
    .map((ct) => ({name: ct.path, content: ct.content, cid: fileMap.get(ct.content) as string}));

  // Combine the results from uploaded and existing files
  return [...uploadedFiles, ...existingFiles];
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
