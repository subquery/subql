// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {execFile} from 'child_process';
import {lstatSync, readFileSync, existsSync} from 'fs';
import util from 'node:util';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {DEFAULT_TS_MANIFEST, extensionIsTs} from '@subql/common';
import glob from 'glob';
import * as inquirer from 'inquirer';
import {fileExistsSync} from 'tsconfig-paths/lib/filesystem';
import {runWebpack} from '../controller/build-controller';
import {resolveToAbsolutePath} from '../utils';

const requireScriptWrapper2 = (scriptPath: string, outputPath: string): string =>
  `
  import yaml from 'js-yaml';
  import {lstatSync, readFileSync,existsSync,writeFileSync} from 'fs';
  const project = require('${scriptPath}');
  const yamlOutput = yaml.dump(project.default);
  writeFileSync('${outputPath}', yamlOutput);
  console.log(\`Project manifest generated to ${outputPath}\`);
  `;

export default class Build extends Command {
  static description = 'Build this SubQuery project code';

  static flags = {
    location: Flags.string({char: 'l', description: 'local folder to run build'}),
    file: Flags.string({
      char: 'f',
      description: 'build with specify manifest file path (will overwrite -l if both used)',
    }),
    output: Flags.string({char: 'o', description: 'output folder of build e.g. dist'}),
    mode: Flags.string({options: ['production', 'prod', 'development', 'dev'], default: 'production'}),
    silent: Flags.boolean({char: 's', description: 'silent mode'}),
  };

  async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Build);
      const directory = flags.file
        ? path.dirname(flags.file)
        : flags.location
        ? resolveToAbsolutePath(flags.location)
        : process.cwd();
      const isDev = flags.mode === 'development' || flags.mode === 'dev';

      if (!lstatSync(directory).isDirectory()) {
        this.error('Argument `location` is not a valid directory');
      }

      // Get the output location from the project package.json main field
      const pjson = JSON.parse(readFileSync(path.join(directory, 'package.json')).toString());

      const defaultEntry = path.join(directory, 'src/index.ts');
      const outputDir = path.resolve(directory, flags.output ?? 'dist');

      let buildEntries: Record<string, string> = {
        index: defaultEntry,
      };

      const projectManifestEntry = flags.file ?? path.join(directory, DEFAULT_TS_MANIFEST);
      if (existsSync(projectManifestEntry) && extensionIsTs(path.extname(projectManifestEntry))) {
        try {
          await this.generateManifestFromTs(projectManifestEntry);
        } catch (e) {
          throw new Error(`Failed to generate manifest from typescript ${projectManifestEntry}, ${e.message}`);
        }
      }
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
  private async generateManifestFromTs(projectManifestEntry: string): Promise<void> {
    const projectYamlPath = path.join(
      path.dirname(projectManifestEntry),
      `${path.basename(projectManifestEntry, path.extname(projectManifestEntry))}.yaml`
    );
    if (fileExistsSync(projectYamlPath)) {
      const outputExist = await inquirer.prompt([
        {
          name: 'replaceCurrentManifest',
          message: `Current project manifest already exist at (${projectYamlPath}), continue process to replace current file?`,
          type: 'confirm',
        },
      ]);
      if (outputExist.replaceCurrentManifest === false) {
        return;
      }
    }
    try {
      await util.promisify(execFile)(
        'ts-node',
        ['-e', requireScriptWrapper2(projectManifestEntry, projectYamlPath)],
        {}
      );
    } catch (error) {
      throw new Error(`When build, failed to execute project script ${projectManifestEntry}: ${error}`);
    }
  }
}
