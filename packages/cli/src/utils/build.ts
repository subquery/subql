// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {execFile} from 'child_process';
import {existsSync, lstatSync} from 'fs';
import util from 'node:util';
import path from 'path';
import {Command} from '@oclif/core';
import {DEFAULT_TS_MANIFEST, extensionIsTs, tsProjectYamlPath} from '@subql/common';

const requireScriptWrapper = (scriptPath: string, outputPath: string): string =>
  `import {toJsonObject} from '@subql/common';` +
  `const {writeFileSync} = require('fs');` +
  `const yaml = require('js-yaml');` +
  `const project = toJsonObject((require('${scriptPath}')).default);` +
  `const yamlOutput = yaml.dump(project);` +
  `writeFileSync('${outputPath}', '# // Auto-generated , DO NOT EDIT\\n' + yamlOutput);`;

export async function buildManifestFromLocation(location: string, command: Command): Promise<string> {
  let directory: string;
  let projectManifestEntry: string;
  // lstatSync will throw if location not exist
  if (lstatSync(location).isDirectory()) {
    directory = location;
    projectManifestEntry = path.join(directory, DEFAULT_TS_MANIFEST);
  } else if (lstatSync(location).isFile()) {
    directory = path.dirname(location);
    projectManifestEntry = location;
  } else {
    command.error('Argument `location` is not a valid directory or file');
  }
  // We compile from TypeScript every time, even if the current YAML file exists, to ensure that the YAML file remains up-to-date with the latest changes
  try {
    await generateManifestFromTs(projectManifestEntry, command);
  } catch (e) {
    throw new Error(`Failed to generate manifest from typescript ${projectManifestEntry}, ${e.message}`);
  }
  return directory;
}

async function generateManifestFromTs(projectManifestEntry: string, command: Command): Promise<void> {
  const projectYamlPath = tsProjectYamlPath(projectManifestEntry);
  try {
    await util.promisify(execFile)(
      'npx',
      ['ts-node', '-e', requireScriptWrapper(projectManifestEntry, projectYamlPath)],
      {cwd: path.dirname(projectManifestEntry)}
    );
    command.log(`Project manifest generated to ${projectYamlPath}`);
  } catch (error) {
    throw new Error(`Failed to build ${projectManifestEntry}: ${error}`);
  }
}
