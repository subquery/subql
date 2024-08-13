// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {existsSync, lstatSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {getBuildEntries, runWebpack} from '../../controller/build-controller';
import {resolveToAbsolutePath, buildManifestFromLocation, getTsManifest} from '../../utils';

export default class Build extends Command {
  static description = 'Build this SubQuery project code';

  static flags = {
    location: Flags.string({char: 'f', description: 'local folder or manifest file to run build'}),
    output: Flags.string({char: 'o', description: 'output folder of build e.g. dist'}),
    mode: Flags.string({options: ['production', 'prod', 'development', 'dev'], default: 'production'}),
    silent: Flags.boolean({char: 's', description: 'silent mode'}),
  };

  async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Build);
      const location = flags.location ? resolveToAbsolutePath(flags.location) : process.cwd();
      const isDev = flags.mode === 'development' || flags.mode === 'dev';

      assert(existsSync(location), 'Argument `location` is not a valid directory or file');
      const directory = lstatSync(location).isDirectory() ? location : path.dirname(location);

      const tsManifest = getTsManifest(location);

      if (tsManifest) {
        await buildManifestFromLocation(
          tsManifest,
          flags.silent
            ? () => {
                /* No-op */
              }
            : this.log.bind(this)
        );
      }

      const buildEntries = getBuildEntries(directory);
      const outputDir = path.resolve(directory, flags.output ?? 'dist');

      await runWebpack(buildEntries, directory, outputDir, isDev, true);
      if (!flags.silent) {
        this.log('Building and packing code ...');
        this.log('Done!');
      }
    } catch (e: any) {
      this.error(e);
    }
  }
}
