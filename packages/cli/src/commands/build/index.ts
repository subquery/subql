// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {existsSync, lstatSync, readFileSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import glob from 'glob';
import {runWebpack} from '../../controller/build-controller';
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

      const tsManifest = getTsManifest(location, this);

      if (tsManifest) {
        await buildManifestFromLocation(tsManifest, this);
      }

      // Get the output location from the project package.json main field
      const pjson = JSON.parse(readFileSync(path.join(directory, 'package.json')).toString());

      const defaultEntry = path.join(directory, 'src/index.ts');
      const outputDir = path.resolve(directory, flags.output ?? 'dist');

      let buildEntries: Record<string, string> = {
        index: defaultEntry,
      };
      glob.sync(path.join(directory, 'src/test/**/*.test.ts')).forEach((testFile) => {
        const testName = path.basename(testFile).replace('.ts', '');
        buildEntries[`test/${testName}`] = testFile;
      });

      glob.sync(path.join(directory, 'src/tests/**/*.test.ts')).forEach((testFile) => {
        const testName = path.basename(testFile).replace('.ts', '');
        buildEntries[`tests/${testName}`] = testFile;
      });

      if (pjson.exports && typeof pjson.exports !== 'string') {
        buildEntries = Object.entries(pjson.exports as Record<string, string>).reduce(
          (acc, [key, value]) => {
            acc[key] = path.resolve(directory, value);
            return acc;
          },
          {...buildEntries}
        );
      }

      for (const i in buildEntries) {
        if (typeof buildEntries[i] !== 'string') {
          this.warn(`Ignoring entry ${i} from build.`);
          delete buildEntries[i];
        }
      }
      await runWebpack(buildEntries, directory, outputDir, isDev, true);
      if (!flags.slient) {
        this.log('Building and packing code ...');
        this.log('Done!');
      }
    } catch (e) {
      this.error(e);
    }
  }
}
