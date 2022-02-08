// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {lstatSync, readFileSync} from 'fs';
import * as fs from 'fs';
import path from 'path';
import {Command, flags} from '@oclif/command';
import yaml from 'js-yaml';
import {uploadToIpfs} from '../controller/publish-controller';
import Build from './build';

// Authorization spec is small enough not to have its own specVersion.
// Additionally when authorization requirements change we would like this to be a breaking change
class AuthorizationSpec {
  secret: string;
}

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Publish extends Command {
  static description = 'Upload this SubQuery project to IPFS';

  static flags = {
    location: flags.string({char: 'l', description: 'local folder'}),
    ipfs: flags.string({description: 'IPFS gateway endpoint', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = this.parse(Publish);

    const directory = flags.location ? path.resolve(flags.location) : process.cwd();

    if (!lstatSync(directory).isDirectory()) {
      this.error('Argument `location` is not a valid directory');
    }

    // Ensure that the project is built
    try {
      await Build.run(['--location', directory]);
    } catch (e) {
      this.log(e);
      this.error('Failed to build project');
    }

    let authToken: string;

    if (process.env.SUBQL_ACCESS_TOKEN) {
      authToken = process.env.SUBQL_ACCESS_TOKEN;
    } else if (fs.existsSync(ACCESS_TOKEN_PATH)) {
      try {
        authToken =
          process.env.SUBQL_ACCESS_TOKEN ??
          (yaml.load(fs.readFileSync(ACCESS_TOKEN_PATH, 'utf8')) as AuthorizationSpec).secret;
      } catch (e) {
        this.error(`Failed to read SUBQL_ACCESS_TOKEN from ${ACCESS_TOKEN_PATH}: ${e}`);
      }
    } else {
      this.error('Please provide SUBQL_ACCESS_TOKEN before publish');
    }

    this.log('Uploading SupQuery project to IPFS');
    const cid = await uploadToIpfs(directory, authToken, flags.ipfs).catch((e) => this.error(e));
    this.log(`SubQuery Project uploaded to IPFS: ${cid}`);
  }
}
