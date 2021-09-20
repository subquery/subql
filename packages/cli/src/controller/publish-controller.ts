// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {loadProjectManifest} from '@subql/common';
import IPFS from 'ipfs-http-client';
import yaml from 'js-yaml';

// https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#filecontent
type FileContent = Uint8Array | string | Iterable<Uint8Array> | Iterable<number> | AsyncIterable<Uint8Array>;

// https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#fileobject
type FileObject = {
  path?: string;
  content?: FileContent;
  mode?: number | string;
  mtime?: Date | number[] | {secs: number; nsecs?: number};
};

type IterableType<T> = T extends AsyncIterable<infer U> ? U : T extends Iterable<infer U> ? U : T;

type AddResult = IterableType<ReturnType<IPFS.IPFSHTTPClient['addAll']>>;

export async function uploadToIpfs(ipfsEndpoint: string, projectDir: string): Promise<AddResult[]> {
  const ipfs = IPFS.create({url: ipfsEndpoint});

  const files = getFiles(projectDir);

  const pendingResults = ipfs.addAll(files, {
    wrapWithDirectory: true,
    pin: true, // Theres no guarantee the server will respect this
  });

  const results: AddResult[] = [];

  for await (const res of pendingResults) {
    results.push(res);
  }

  return results;
}

function getFiles(projectDir: string): FileObject[] {
  const projectManifestPath = path.resolve(projectDir, 'project.yaml');
  const manifest = loadProjectManifest(projectManifestPath);
  const schemaPath = path.resolve(projectDir, manifest.schema);

  if (manifest.specVersion === '0.0.1') {
    const packageJsonPath = path.resolve(projectDir, 'package.json');
    const codePath = JSON.parse(fs.readFileSync(packageJsonPath).toString()).main;

    return [projectManifestPath, schemaPath, packageJsonPath, path.resolve(projectDir, codePath)].map((path) =>
      getFileObject(projectDir, path)
    );
  }

  throw new Error('Unsupported project manifest spec');
}

function getFileObject(rootPath: string, filePath: string): FileObject {
  const relPath = path.relative(rootPath, filePath).replace(/\\/g, '/');

  if (path.extname(filePath).includes('.yaml')) {
    return {
      path: relPath,
      content: minifyYaml(fs.readFileSync(filePath, 'utf8')),
    };
  }

  return {
    path: relPath,
    content: fs.createReadStream(filePath),
  };
}

function minifyYaml(raw: string): string {
  const doc = yaml.load(raw);

  return yaml.dump(doc, {
    sortKeys: true,
    condenseFlow: true,
  });
}
