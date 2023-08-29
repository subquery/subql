// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {ReaderFactory, IPFS_WRITE_ENDPOINT, Reader} from '@subql/common';
import {parseAlgorandProjectManifest} from '@subql/common-algorand';
import {parseCosmosProjectManifest} from '@subql/common-cosmos';
import {parseEthereumProjectManifest} from '@subql/common-ethereum';
import {parseEthereumProjectManifest as parseFlareProjectManifest} from '@subql/common-flare';
import {parseNearProjectManifest} from '@subql/common-near';
import {parseStellarProjectManifest} from '@subql/common-stellar';
import {parseSubstrateProjectManifest} from '@subql/common-substrate';
import {FileReference} from '@subql/types';
import {IPFSHTTPClient, create} from 'ipfs-http-client';
import yaml from 'js-yaml';

const PIN_SERVICE = 'onfinality';

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
  multichainProjectPath?: string,
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
    const schema = await reader.getProjectSchema();

    const parsingFunctions = [
      parseSubstrateProjectManifest,
      parseCosmosProjectManifest,
      parseAlgorandProjectManifest,
      parseEthereumProjectManifest,
      parseFlareProjectManifest,
      parseNearProjectManifest,
      parseStellarProjectManifest,
    ];

    let manifest = null;
    for (const parseFunction of parsingFunctions) {
      try {
        manifest = parseFunction(schema).asImpl;
        break; // Exit the loop if successful
      } catch (e) {
        // Continue to the next parsing function
      }
    }

    if (manifest === null) {
      throw new Error('Unable to parse project manifest');
    }

    const deployment = await replaceFileReferences(reader.root, manifest.deployment, authToken, ipfs);

    // Use JSON.* to convert Map to Object
    const deploymentStr = yaml.dump(JSON.parse(JSON.stringify(deployment)), {sortKeys: true, condenseFlow: true});

    contents.push({
      path: path.join(directory ?? '', path.basename(project)),
      content: deploymentStr,
    });
  }

  if (multichainProjectPath) {
    const content = fs.readFileSync(multichainProjectPath);
    contents.push({
      path: path.join(directory ?? '', path.basename(multichainProjectPath)),
      content: content.toString(),
    });
  }

  // Upload schema
  return uploadFiles(contents, authToken, ipfs);
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
      const filePath = path.resolve(projectDir, input.file);
      const content = fs.readFileSync(path.resolve(projectDir, input.file));
      input.file = await uploadFile({content: content.toString(), path: filePath}, authToken, ipfs).then(
        (cid) => `ipfs://${cid}`
      );
    }
    const keys = Object.keys(input).filter((key) => key !== '_deployment') as unknown as (keyof T)[];
    await Promise.all(
      keys.map(async (key) => {
        // this is the loop
        input[key] = await replaceFileReferences(projectDir, input[key], authToken, ipfs);
      })
    );
  }

  return input;
}

const fileMap = new Map<string | fs.ReadStream, Promise<string>>();

export async function uploadFiles(
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

  const ipfsWrite = create({
    url: IPFS_WRITE_ENDPOINT,
    headers: {Authorization: `Bearer ${authToken}`},
  });

  try {
    const results = ipfsWrite.addAll(contents, {pin: true, cidVersion: 0});

    for await (const result of results) {
      fileCidMap.set(result.path, result.cid.toString());

      await ipfsWrite.pin.remote.add(result.cid, {service: PIN_SERVICE}).catch((e) => {
        console.warn(
          `Failed to pin file ${result.path}. There might be problems with this file being accessible later. ${e}`
        );
      });
    }
  } catch (e) {
    throw new Error(`Publish project to default failed, ${e}`);
  }

  return fileCidMap;
}

export async function uploadFile(
  contents: {path: string; content: string},
  authToken: string,
  ipfs?: IPFSHTTPClient
): Promise<string> {
  if (fileMap.has(contents.path)) {
    return fileMap.get(contents.path);
  }

  let pendingClientCid: Promise<string>;
  if (ipfs) {
    pendingClientCid = ipfs
      .add(contents.content, {pin: true, cidVersion: 0})
      .then((result) => result.cid.toString())
      .catch((e) => {
        throw new Error(`Publish project to default failed, ${e}`);
      });
  }

  const ipfsWrite = create({
    url: IPFS_WRITE_ENDPOINT,
    headers: {Authorization: `Bearer ${authToken}`},
  });

  const pendingCid = ipfsWrite
    .add(contents.content, {pin: true, cidVersion: 0})
    .then((result) => result.cid)
    .then(async (cid) => {
      try {
        await ipfsWrite.pin.remote.add(cid, {service: PIN_SERVICE});
        return cid.toString();
      } catch (e) {
        console.warn(
          `Failed to pin file ${contents.path}. There might be problems with this file being accessible later. ${e}`
        );
        return cid.toString();
      }
    })
    .catch((e) => {
      throw new Error(`Publish project to default failed, ${e}`);
    });

  fileMap.set(contents.path, pendingCid);

  const [cid, clientCid] = await Promise.all([pendingCid, pendingClientCid]);

  if (clientCid && clientCid !== cid) {
    throw new Error(`Published and received IPFS cid not identical \n,
    Client IPFS: ${clientCid}, IPFS: ${cid}`);
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
