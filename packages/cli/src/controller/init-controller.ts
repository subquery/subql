// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import childProcess from 'child_process';
import fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';
import {ProjectManifestV0_0_1, ProjectManifestV0_2_0, SubstrateProjectManifestV0_3_0} from '@subql/common-substrate';
import {TerraProjectManifestV0_3_0} from '@subql/common-terra/project/versioned/v0_3_0/types';
import yaml from 'js-yaml';
import rimraf from 'rimraf';
import simpleGit from 'simple-git';
import {isProjectSpecV0_0_1, isProjectSpecV0_2_0, isTerraProjectSpecV0_3_0, ProjectSpecBase} from '../types';

export async function createProject(localPath: string, project: ProjectSpecBase): Promise<string> {
  const projectPath = path.join(localPath, project.name);
  let STARTER_PATH;
  if (isTerraProjectSpecV0_3_0(project)) {
    STARTER_PATH = 'https://github.com/DeveloperInProgress/subqlstarter-terra';
  } else {
    STARTER_PATH = 'https://github.com/subquery/subql-starter';
  }

  let cloneArgs: string[] = [];
  if (isProjectSpecV0_0_1(project)) {
    console.log('Creating project with version 0.0.1');
    cloneArgs = ['-b', 'v0.0.1', '--single-branch'];
  } else if (isProjectSpecV0_2_0(project)) {
    cloneArgs = ['-b', 'v0.2.0', '--single-branch'];
  }
  console.log(cloneArgs);
  // try {
  await simpleGit().clone(STARTER_PATH, projectPath, cloneArgs);
  //} catch (e) {
  //  throw new Error('Failed to clone starter template from git');
  //}
  try {
    await prepareManifest(projectPath, project);
  } catch (e) {
    throw new Error('Failed to prepare read or write manifest while preparing the project');
  }
  try {
    await preparePackage(projectPath, project);
  } catch (e) {
    throw new Error('Failed to prepare read or write package.json while preparing the project');
  }
  try {
    await promisify(rimraf)(`${projectPath}/.git`);
  } catch (e) {
    throw new Error('Failed to remove .git from starter project');
  }

  return projectPath;
}

async function preparePackage(projectPath: string, project: ProjectSpecBase): Promise<void> {
  //load and write package.json
  const packageData = await fs.promises.readFile(`${projectPath}/package.json`);
  const currentPackage = JSON.parse(packageData.toString());
  currentPackage.name = project.name;
  currentPackage.version = project.version;
  currentPackage.description = project.description ?? currentPackage.description;
  currentPackage.author = project.author;
  currentPackage.license = project.license;
  const newPackage = JSON.stringify(currentPackage, null, 2);
  await fs.promises.writeFile(`${projectPath}/package.json`, newPackage, 'utf8');
}

async function prepareManifest(projectPath: string, project: ProjectSpecBase): Promise<void> {
  //load and write manifest(project.yaml)
  const yamlPath = path.join(`${projectPath}`, `project.yaml`);
  const manifest = await fs.promises.readFile(yamlPath, 'utf8');
  const data = yaml.load(manifest) as ProjectManifestV0_0_1 | ProjectManifestV0_2_0 | TerraProjectManifestV0_3_0;
  data.description = project.description ?? data.description;
  data.repository = project.repository ?? '';

  data.network.endpoint = project.endpoint;

  if (isProjectSpecV0_2_0(project)) {
    (data as ProjectManifestV0_2_0).version = project.version;
    (data as ProjectManifestV0_2_0).name = project.name;
    (data as ProjectManifestV0_2_0).network.genesisHash = project.genesisHash;
  }

  if (isTerraProjectSpecV0_3_0(project)) {
    (data as TerraProjectManifestV0_3_0).version = project.version;
    (data as TerraProjectManifestV0_3_0).name = project.name;
    (data as TerraProjectManifestV0_3_0).network.chainId = project.chainId;
  }

  const newYaml = yaml.dump(data);
  await fs.promises.writeFile(yamlPath, newYaml, 'utf8');
}

export function installDependencies(projectPath: string, useNpm?: boolean): void {
  let command = 'yarn install';

  if (useNpm || !checkYarnExists()) {
    command = 'npm install';
  }

  childProcess.execSync(command, {cwd: projectPath});
}

function checkYarnExists(): boolean {
  try {
    childProcess.execSync('yarn --version');
    return true;
  } catch (e) {
    return false;
  }
}
