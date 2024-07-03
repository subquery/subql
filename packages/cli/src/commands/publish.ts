// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {getMultichainManifestPath, getProjectRootAndManifest} from '@subql/common';
import {createIPFSFile, uploadToIpfs} from '../controller/publish-controller';
import {checkToken, resolveToAbsolutePath} from '../utils';
import Build from './build';

export default class Publish extends Command {
  static description = 'Upload this SubQuery project to IPFS';

  static flags = {
    location: Flags.string({char: 'f', description: 'from project folder or specify manifest file'}),
    ipfs: Flags.string({description: 'IPFS gateway endpoint', required: false}),
    output: Flags.boolean({char: 'o', description: 'Output IPFS CID', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Publish);
    const location = flags.location ? resolveToAbsolutePath(flags.location) : process.cwd();

    try {
      await Build.run(['--location', location, '-s']);
    } catch (e: any) {
      this.log(e);
      this.error('Failed to build project');
    }

    // Make sure build first, generated project yaml could be added to the project (instead of ts)
    const project = getProjectRootAndManifest(location);

    const authToken = await checkToken();

    const fullPaths = project.manifests.map((manifest) => path.join(project.root, manifest));

    let multichainManifestPath = getMultichainManifestPath(location);
    if (multichainManifestPath) {
      multichainManifestPath = path.join(project.root, multichainManifestPath);
    }

    const fileToCidMap = await uploadToIpfs(fullPaths, authToken.trim(), multichainManifestPath, flags.ipfs).catch(
      (e) => {
        // log further cause from error
        if (e.cause) {
          console.error(e.cause);
        }
        return this.error(e);
      }
    );

    await Promise.all(
      project.manifests.map((manifest) => {
        const cid = fileToCidMap.get(manifest);
        assert(cid, `CID for ${manifest} not found`);
        return createIPFSFile(project.root, manifest, cid);
      })
    );

    const directoryCid = Array.from(fileToCidMap).find(([file]) => file === '');

    if (!flags.output) {
      if (directoryCid) {
        this.log(`SubQuery Multichain Project uploaded to IPFS: ${directoryCid[1]}`);
      }

      fileToCidMap.forEach((cid, file) => {
        if (file !== '') {
          this.log(`${directoryCid ? '- This includes' : 'SubQuery Project'} ${file} uploaded to IPFS: ${cid}`);
        }
      });
    } else {
      if (directoryCid) {
        this.log(directoryCid[1]);
      } else {
        fileToCidMap.forEach((cid, file) => {
          if (file !== '') {
            this.log(cid);
          }
        });
      }
    }
  }
}
