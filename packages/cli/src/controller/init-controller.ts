// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import childProcess, {execSync} from 'child_process';
import fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';
import {loadFromJsonOrYaml, makeTempDir} from '@subql/common';
import {parseEthereumProjectManifest} from '@subql/common-ethereum';
import axios from 'axios';
import {copySync} from 'fs-extra';
import rimraf from 'rimraf';
import git from 'simple-git';
import {parseDocument, YAMLSeq} from 'yaml';
import {BASE_TEMPLATE_URl, ENDPOINT_REG, SPEC_VERSION_REG} from '../constants';
import {ProjectSpecBase} from '../types';
import {errorHandle, extractFromTs, findReplace, prepareDirPath, validateEthereumTsManifest} from '../utils';

export interface ExampleProjectInterface {
  name: string;
  description: string;
  remote: string;
  path: string;
}

export interface Network {
  code: string;
  name: string;
  chain_id: string;
  description: string;
  logo: string;
}

export interface Template {
  code: string;
  name: string;
  description: string;
  logo: string;
  networks: {
    code: string;
    name: string;
    chain_id: string;
    description: string;
    logo: string;
    examples: ExampleProjectInterface[];
  }[];
}
// GET /all
// https://templates.subquery.network/all
export async function fetchTemplates(): Promise<Template[]> {
  try {
    return (
      await axios({
        method: 'get',
        url: '/all', // /networks
        baseURL: BASE_TEMPLATE_URl,
      })
    ).data?.templates as Template[];
  } catch (e) {
    errorHandle(e, `Update to reach endpoint '${BASE_TEMPLATE_URl}/all`);
  }
}

// GET /networks
// https://templates.subquery.network/networks
export async function fetchNetworks(): Promise<Template[]> {
  try {
    return (
      await axios({
        method: 'get',
        url: '/networks',
        baseURL: BASE_TEMPLATE_URl,
      })
    ).data.results as Template[];
  } catch (e) {
    errorHandle(e, `Update to reach endpoint '${BASE_TEMPLATE_URl}/networks`);
  }
}

// The family query param must be an exact case-insensitive match otherwise an empty result will be returned
export async function fetchExampleProjects(
  familyCode: string,
  networkCode: string
): Promise<ExampleProjectInterface[]> {
  try {
    return (
      await axios({
        method: 'get',
        url: `/networks/${familyCode}/${networkCode}`,
        baseURL: BASE_TEMPLATE_URl,
      })
    ).data.results as ExampleProjectInterface[];
  } catch (e) {
    errorHandle(e, `Update to reach endpoint ${familyCode}/${networkCode}`);
  }
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
  selectedProject: ExampleProjectInterface
): Promise<string> {
  const projectPath = path.join(localPath, projectName);
  //make temp directory to store project
  const tempPath = await makeTempDir();
  //use sparse-checkout to clone project to temp directory
  await git(tempPath).init().addRemote('origin', selectedProject.remote);
  await git(tempPath).raw('sparse-checkout', 'set', `${selectedProject.path}`);
  await git(tempPath).raw('pull', 'origin', 'main');
  // Copy content to project path
  copySync(path.join(tempPath, `${selectedProject.path}`), projectPath);
  // Clean temp folder
  fs.rmSync(tempPath, {recursive: true, force: true});
  return projectPath;
}

export async function readDefaults(projectPath: string): Promise<string[]> {
  const packageData = await fs.promises.readFile(`${projectPath}/package.json`);
  const currentPackage = JSON.parse(packageData.toString());
  const tsPath = path.join(`${projectPath}`, `project.ts`);
  const manifest = await fs.promises.readFile(tsPath, 'utf8');
  const currentProject = extractFromTs(manifest, {
    specVersion: SPEC_VERSION_REG,
    endpoint: ENDPOINT_REG,
  });
  return [currentProject.specVersion, currentProject.endpoint, currentPackage.author, currentPackage.description];
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

export async function preparePackage(projectPath: string, project: ProjectSpecBase): Promise<void> {
  //load and write package.json
  const packageData = await fs.promises.readFile(`${projectPath}/package.json`);
  const currentPackage = JSON.parse(packageData.toString());
  currentPackage.name = project.name;
  currentPackage.description = project.description ?? currentPackage.description;
  currentPackage.author = project.author;
  const newPackage = JSON.stringify(currentPackage, null, 2);
  await fs.promises.writeFile(`${projectPath}/package.json`, newPackage, 'utf8');
}

export async function prepareManifest(projectPath: string, project: ProjectSpecBase): Promise<void> {
  //load and write manifest(project.ts)
  const tsPath = path.join(`${projectPath}`, `project.ts`);
  const manifest = (await fs.promises.readFile(tsPath, 'utf8')).toString();

  const formattedEndpoint = `[ ${JSON.stringify(project.endpoint).slice(1, -1)} ]`;

  const v = findReplace(manifest, /endpoint:\s*\[\s*([\s\S]*?)\s*\]/, `endpoint: ${formattedEndpoint}`);

  await fs.promises.writeFile(tsPath, v, 'utf8');
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

export async function prepareProjectScaffold(projectPath: string): Promise<void> {
  // remove all existing abis & handler files
  await prepareDirPath(path.join(projectPath, 'abis/'), false);
  await prepareDirPath(path.join(projectPath, 'src/mappings/'), true);

  // clean datasource
  const manifest = parseDocument(
    (await fs.promises.readFile(path.join(projectPath, 'project.yaml'), 'utf8')) as string
  );
  manifest.set('dataSources', new YAMLSeq());
  await fs.promises.writeFile(path.join(projectPath, 'project.yaml'), manifest.toString(), 'utf8');

  // remove handler file from index.ts
  fs.truncateSync(path.join(projectPath, 'src/index.ts'), 0);
}

export async function validateEthereumProjectManifest(projectPath: string): Promise<boolean> {
  const manifest = await fs.promises.readFile(path.join(projectPath, 'project.ts'), 'utf8');
  try {
    return validateEthereumTsManifest(manifest.toString());
  } catch (e) {
    return false;
  }
}
