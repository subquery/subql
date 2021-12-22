// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {lstatSync, readFileSync} from 'fs';
import path from 'path';
import {Command, flags} from '@oclif/command';
import cli from 'cli-ux';
import {runWebpack} from '../controller/build-controller';
import Validate from './validate';

export default class Build extends Command {
  static description = 'Build this SubQuery project code';

  static flags = {
    location: flags.string({char: 'l', description: 'local folder'}),
    mode: flags.enum({options: ['production', 'prod', 'development', 'dev'], default: 'production'}),
  };

  async run(): Promise<void> {
    const {flags} = this.parse(Build);

    const directory = flags.location ? path.resolve(flags.location) : process.cwd();
    const isDev = flags.mode === 'development' || flags.mode === 'dev';

    if (!lstatSync(directory).isDirectory()) {
      this.error('Argument `location` is not a valid directory');
    }

    // Check that we're in a valid project
    try {
      await Validate.run(['--silent', '--location', directory]);
    } catch (e) {
      this.error('Directory is not a valid project');
    }

    // Get the output location from the project package.json main field
    const pjson = JSON.parse(readFileSync(path.join(directory, 'package.json')).toString());

    let buildPath = 'src/index.ts';

    if (pjson.exports) {
      if (typeof pjson.exports === 'string') {
        buildPath = pjson.exports;
      } else {
        this.warn('The `exports` field in package.json is not a string. Using src/index.ts instead.');
      }
    }

    const outputPath = path.resolve(directory, pjson.main || 'dist/index.js');

    cli.action.start('Building and packing code');
    await runWebpack(path.join(directory, buildPath), outputPath, isDev, true);
    cli.action.stop();
  }
}
