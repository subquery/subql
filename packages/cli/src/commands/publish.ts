// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {lstatSync, readFileSync} from 'fs';
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

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.SUBQL_ACCESS_TOKEN');

export default class Publish extends Command {
  static description = 'Upload this SubQuery project to IPFS';

  static flags = {
    location: flags.string({char: 'l', description: 'local folder'}),
    ipfs: flags.string({description: 'IPFS gateway endpoint', required: false}),
    'access-token': flags.string({description: 'Secret authorization token', required: false}),
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
    if (flags['access-token']) {
      authToken = flags['access-token'];
    } else {
      try {
        authToken =
          process.env.SUBQL_ACCESS_TOKEN ??
          (yaml.load(readFileSync(ACCESS_TOKEN_PATH, 'utf8')) as AuthorizationSpec).secret;
      } catch (e) {
        this.error(`Failed to read SUBQL_ACCESS_TOKEN: ${e}`);
      }
    }
    this.log('Uploading SupQuery project to IPFS');
    const cid = await uploadToIpfs(directory, flags.ipfs, authToken).catch((e) => this.error(e));
    this.log(`SubQuery Project uploaded to IPFS: ${cid}`);
  }
}
