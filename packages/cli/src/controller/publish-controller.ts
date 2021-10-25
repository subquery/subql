// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {
  loadProjectManifest,
  manifestIsV0_2_0,
  ProjectManifestV0_0_1Impl,
  ProjectManifestV0_2_0Impl,
} from '@subql/common';
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
  const manifest = loadProjectManifest(projectManifestPath).asImpl;

  if (manifestIsV0_2_0(manifest)) {
    const entryPaths = manifest.dataSources.map((ds) => ds.mapping.file);
    const schemaPath = manifest.schema.file;

    // Upload referenced files to IPFS
    const [schema, ...entryPoints] = await Promise.all(
      [schemaPath, ...entryPaths].map((filePath) =>
        uploadFile(ipfs, fs.createReadStream(path.resolve(projectDir, filePath))).then((cid) => `ipfs://${cid}`)
      )
    );

    // Update referenced file paths to IPFS cids
    manifest.schema.file = schema;

    entryPoints.forEach((entryPoint, index) => {
      manifest.dataSources[index].mapping.file = entryPoint;
    });
  } else {
    throw new Error('Unsupported project manifest spec, only 0.2.0 is supported');
  }

  // Upload schema
  return uploadFile(ipfs, toMinifiedYaml(manifest));
}

async function uploadFile(ipfs: IPFS.IPFSHTTPClient, content: FileObject | FileContent): Promise<string> {
  const result = await ipfs.add(content, {pin: true, cidVersion: 0});
  return result.cid.toString();
}

function toMinifiedYaml(manifest: ProjectManifestV0_0_1Impl | ProjectManifestV0_2_0Impl): string {
  return yaml.dump(manifest, {
    sortKeys: true,
    condenseFlow: true,
  });
}
