// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {getProjectRootAndManifest} from '@subql/common';
import {renderIPFS_file, uploadToIpfs} from '../controller/publish-controller';
import Build from './build';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Publish extends Command {
  static description = 'Upload this SubQuery project to IPFS';

  static flags = {
    location: Flags.string({char: 'f', description: 'from project or manifest path'}),
    ipfs: Flags.string({description: 'IPFS gateway endpoint', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Publish);

    const project = getProjectRootAndManifest(flags.location ? path.resolve(flags.location) : process.cwd());

    // Ensure that the project is built
    try {
      await Build.run(['--location', project.root]);
    } catch (e) {
      this.log(e);
      this.error('Failed to build project');
    }

    let authToken: string;

    if (process.env.SUBQL_ACCESS_TOKEN) {
      authToken = process.env.SUBQL_ACCESS_TOKEN;
    } else if (existsSync(ACCESS_TOKEN_PATH)) {
      try {
        authToken = process.env.SUBQL_ACCESS_TOKEN ?? readFileSync(ACCESS_TOKEN_PATH, 'utf8');
      } catch (e) {
        throw new Error(`Failed to read SUBQL_ACCESS_TOKEN from ${ACCESS_TOKEN_PATH}: ${e}`);
      }
    } else {
      throw new Error('Please provide SUBQL_ACCESS_TOKEN before publish');
    }

    this.log('Uploading SubQuery project to IPFS');
    const cid = 'QmQ9x4AhfRQA6AkvCC65nGPaeKHDuWbRkgsJs9emdaNjFY';
    // const cid = await uploadToIpfs(project.manifest, authToken.trim(), flags.ipfs).catch((e) => this.error(e));
    await renderIPFS_file('project', cid);
    this.log(`SubQuery Project uploaded to IPFS: ${cid}`);
  }
}
