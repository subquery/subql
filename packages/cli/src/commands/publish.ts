// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {lstatSync} from 'fs';
import path from 'path';
import {Command, flags} from '@oclif/command';
import Build from './build';
import {uploadToIpfs} from '../controller/publish-controller';

export default class Publish extends Command {
  static description = 'Upload this SubQuery project to IPFS';

  static flags = {
    location: flags.string({char: 'l', description: 'local folder'}),
    ipfs: flags.string({description: 'IPFS gateway endpoint', default: 'http://localhost:5001/api/v0'}),
    verbose: flags.boolean(),
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

    this.log('Uploading SupQuery project to ipfs');
    const results = await uploadToIpfs(flags.ipfs, directory);

    if (flags.verbose) {
      results.forEach((result) => {
        this.log(`Uploaded file path="${result.path}" cid="${result.cid.toString()}"`);
      });
    }

    // Last item is the wrwpped directory
    const directoryHash = results[results.length - 1].cid.toString();

    this.log(`SubQuery Project uploaded to IPFS: ${directoryHash}`);
  }
}
