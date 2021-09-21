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

export async function uploadToIpfs(ipfsEndpoint: string, projectDir: string): Promise<string> {
  const ipfs = IPFS.create({url: ipfsEndpoint});

  const projectManifestPath = path.resolve(projectDir, 'project.yaml');
  const manifest = loadProjectManifest(projectManifestPath);

  if (manifest.specVersion === '0.0.1') {
    const packageJsonPath = path.resolve(projectDir, 'package.json');

    const codePath = JSON.parse(fs.readFileSync(packageJsonPath).toString()).main;
    const schemaPath = manifest.schema;

    const [codeCid, schemaCid] = await Promise.all(
      [codePath, schemaPath].map((filePath) =>
        uploadFile(ipfs, fs.createReadStream(path.resolve(projectDir, filePath))).then((cid) => `ipfs://` + cid)
      )
    );

    // Update references in schema
    manifest.schema = schemaCid;
    // (manifest as any).main = codeCid;
  } else {
    throw new Error('Unsupported project manifest spec');
  }

  // Upload schema
  return uploadFile(ipfs, minifyYaml(JSON.stringify(manifest)));
}

async function uploadFile(ipfs: IPFS.IPFSHTTPClient, content: FileObject | FileContent): Promise<string> {
  const result = await ipfs.add(content, {pin: true, cidVersion: 0});
  return result.cid.toString();
}

function minifyYaml(raw: string): string {
  const doc = yaml.load(raw);

  return yaml.dump(doc, {
    sortKeys: true,
    condenseFlow: true,
  });
}
