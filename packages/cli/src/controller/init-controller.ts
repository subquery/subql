// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import childProcess, {execSync} from 'child_process';
import fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';
import {makeTempDir, ProjectManifestV0_2_0, ProjectManifestV1_0_0} from '@subql/common';
import {ProjectManifestV0_0_1} from '@subql/common-substrate';
import axios from 'axios';
import {copySync} from 'fs-extra';
import yaml from 'js-yaml';
import rimraf from 'rimraf';
import git from 'simple-git';
import {isProjectSpecV0_2_0, isProjectSpecV1_0_0, ProjectSpecBase} from '../types';
const TEMPLATES_REMOTE = 'https://raw.githubusercontent.com/subquery/templates/multi/templates.json';

export interface Template {
  name: string;
  description: string;
  remote: string;
  branch: string;
  network: string;
  family: string;
}

export async function fetchTemplates(remote: string = TEMPLATES_REMOTE): Promise<Template[]> {
  return axios
    .create()
    .get(remote)
    .then(({data}) => data as Template[])
    .catch((err) => {
      throw new Error(`Unable to reach endpoint '${remote}', ${err}`);
    });
}

export async function cloneProjectGit(
  localPath: string,
  projectName: string,
  projectRemote: string,
  branch: string
): Promise<string> {
  const projectPath = path.join(localPath, projectName);
  try {
    await git().clone(projectRemote, projectPath, ['-b', branch, '--single-branch']);
  } catch (e) {
    let err = 'Failed to clone starter template from git';
    try {
      execSync('git --version');
    } catch (_) {
      err += ', please install git and ensure that it is available from command line';
    }
    throw new Error(err);
  }
  return projectPath;
}

export async function cloneProjectTemplate(
  localPath: string,
  projectName: string,
  selectedTemplate: Template
): Promise<string> {
  const projectPath = path.join(localPath, projectName);
  //make temp directory to store project
  const tempPath = await makeTempDir();
  //use sparse-checkout to clone project to temp directory
  await git(tempPath).init().addRemote('origin', selectedTemplate.remote);
  await git(tempPath).raw('sparse-checkout', 'set', `${selectedTemplate.network}/${selectedTemplate.name}`);
  await git(tempPath).raw('pull', 'origin', selectedTemplate.branch);
  // Copy content to project path
  copySync(path.join(tempPath, `${selectedTemplate.network}/${selectedTemplate.name}`), projectPath);
  // Clean temp folder
  fs.rmSync(tempPath, {recursive: true, force: true});
  return projectPath;
}

export async function readDefaults(projectPath: string): Promise<string[]> {
  const packageData = await fs.promises.readFile(`${projectPath}/package.json`);
  const currentPackage = JSON.parse(packageData.toString());

  const yamlPath = path.join(`${projectPath}`, `project.yaml`);
  const manifest = await fs.promises.readFile(yamlPath, 'utf8');
  const currentProject = yaml.load(manifest) as ProjectManifestV0_0_1 | ProjectManifestV0_2_0 | ProjectManifestV1_0_0;
  return [
    currentProject.specVersion,
    currentProject.repository,
    currentProject.network.endpoint,
    currentPackage.author,
    currentPackage.version,
    currentPackage.description,
    currentPackage.license,
  ];
}

export async function prepare(projectPath: string, project: ProjectSpecBase): Promise<void> {
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
    throw new Error('Failed to remove .git from template project');
  }
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
  const data = yaml.load(manifest) as ProjectManifestV0_0_1 | ProjectManifestV0_2_0 | ProjectManifestV1_0_0;
  data.description = project.description ?? data.description;
  data.repository = project.repository ?? '';

  data.network.endpoint = project.endpoint;

  if (isProjectSpecV1_0_0(project)) {
    (data as ProjectManifestV1_0_0).version = project.version;
    (data as ProjectManifestV1_0_0).name = project.name;
    (data as ProjectManifestV1_0_0).network.chainId = project.chainId;
  } else if (isProjectSpecV0_2_0(project)) {
    (data as ProjectManifestV0_2_0).version = project.version;
    (data as ProjectManifestV0_2_0).name = project.name;
    (data as ProjectManifestV0_2_0).network.genesisHash = project.genesisHash;
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
