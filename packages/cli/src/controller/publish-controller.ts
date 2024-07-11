// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  ReaderFactory,
  IPFS_WRITE_ENDPOINT,
  isFileReference,
  validateCommonProjectManifest,
  mapToObject,
  getProjectNetwork,
  IPFSHTTPClientLite,
} from '@subql/common';
import {Reader} from '@subql/types-core';
import {loadDependency} from '../modulars';

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

  let ipfs: IPFSHTTPClientLite | undefined;
  if (ipfsEndpoint) {
    ipfs = new IPFSHTTPClientLite({url: ipfsEndpoint});
  }

  for (const project in projectToReader) {
    const reader = projectToReader[project];
    const schema = await reader.getProjectSchema();

    validateCommonProjectManifest(schema);

    const networkFamily = getProjectNetwork(schema);
    const module = loadDependency(networkFamily);
    assert(module, `Failed to load module for network ${networkFamily}`);

    let manifest;

    try {
      manifest = module.parseProjectManifest(schema).asImpl;
    } catch (e) {
      throw new Error(`Failed to parse project manifest for network ${networkFamily}`, {cause: e});
    }

    if (manifest === null) {
      throw new Error('Unable to parse project manifest');
    }

    assert(reader.root, 'Reader root is not set');
    // the JSON object conversion must occur on manifest.deployment
    const deployment = await replaceFileReferences(reader.root, manifest.deployment, authToken, ipfs);

    // Use JSON.* to convert Map to Object
    contents.push({
      path: path.join(directory ?? '', path.basename(project)),
      content: deployment.toYaml(),
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
  return uploadFiles(contents, authToken, multichainProjectPath !== undefined, ipfs);
}

/* Recursively finds all FileReferences in an object and replaces the files with IPFS references */
async function replaceFileReferences<T extends Record<string, any>>(
  projectDir: string,
  input: T,
  authToken: string,
  ipfs?: IPFSHTTPClientLite
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
  isMultichain?: boolean,
  ipfs?: IPFSHTTPClientLite
): Promise<Map<string, string>> {
  const fileCidMap: Map<string, string> = new Map();

  if (ipfs) {
    try {
      const results = await ipfs.addAll(contents, {wrapWithDirectory: isMultichain});

      for (const result of results) {
        fileCidMap.set(result.path, result.cid.toString());
      }
    } catch (e) {
      throw new Error(`Publish project to provided IPFS gateway failed`, {cause: e});
    }
  }

  const ipfsWrite = new IPFSHTTPClientLite({
    url: IPFS_WRITE_ENDPOINT,
    headers: {Authorization: `Bearer ${authToken}`},
  });

  try {
    const results = await ipfsWrite.addAll(contents, {pin: true, cidVersion: 0, wrapWithDirectory: isMultichain});
    for (const result of results) {
      fileCidMap.set(result.path, result.cid);

      await ipfsWrite.pinRemoteAdd(result.cid, {service: PIN_SERVICE}).catch((e) => {
        console.warn(
          `Failed to pin file ${result.path}. There might be problems with this file being accessible later. ${e}`
        );
      });
    }
  } catch (e) {
    throw new Error(`Publish project files to IPFS failed`, {cause: e});
  }

  return fileCidMap;
}

export async function uploadFile(
  contents: {path: string; content: string},
  authToken: string,
  ipfs?: IPFSHTTPClientLite
): Promise<string> {
  const pathPromise = fileMap.get(contents.path);
  if (pathPromise !== undefined) {
    return pathPromise;
  }

  let pendingClientCid: Promise<string> = Promise.resolve('');
  if (ipfs) {
    pendingClientCid = ipfs
      .add(contents.content, {pin: true, cidVersion: 0})
      .then((result) => result.cid.toString())
      .catch((e) => {
        throw new Error(`Publish file to provided IPFS failed`, {cause: e});
      });
  }

  const ipfsWrite = new IPFSHTTPClientLite({
    url: IPFS_WRITE_ENDPOINT,
    headers: {Authorization: `Bearer ${authToken}`},
  });

  const pendingCid = ipfsWrite
    .add(contents.content, {pin: true, cidVersion: 0})
    .then((result) => result.cid)
    .then(async (cid) => {
      try {
        await ipfsWrite.pinRemoteAdd(cid, {service: PIN_SERVICE});
        return cid.toString();
      } catch (e) {
        console.warn(
          `Failed to pin file ${contents.path}. There might be problems with this file being accessible later. ${e}`
        );
        return cid.toString();
      }
    })
    .catch((e) => {
      throw new Error(`Publish project to default IPFS failed`, {cause: e});
    });

  fileMap.set(contents.path, pendingCid);

  const [cid, clientCid] = await Promise.all([pendingCid, pendingClientCid]);

  if (clientCid && clientCid !== cid) {
    throw new Error(`Published and received IPFS cid not identical \n,
    Client IPFS: ${clientCid}, IPFS: ${cid}`);
  }

  return cid;
}

export function getDirectoryCid(fileToCidMap: Map<string, string>): string | undefined {
  const directoryCid = fileToCidMap.get('');
  return directoryCid;
}
