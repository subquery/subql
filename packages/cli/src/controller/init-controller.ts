// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import childProcess, {execSync} from 'child_process';
import fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';
import {extractDefaults, loadFromJsonOrYaml, makeTempDir} from '@subql/common';
import {parseEthereumProjectManifest} from '@subql/common-ethereum';
import {ProjectManifestV1_0_0} from '@subql/types-core';
import axios from 'axios';
import {copySync} from 'fs-extra';
import rimraf from 'rimraf';
import git from 'simple-git';
import {parseDocument, YAMLMap, YAMLSeq} from 'yaml';
import {BASE_TEMPLATE_URl} from '../constants';
import {isProjectSpecV0_2_0, isProjectSpecV1_0_0, ProjectSpecBase} from '../types';
import {errorHandle, prepareDirPath} from '../utils';

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

const requireScriptWrapper = (scriptPath: string, outputPath: string): string =>
  `import {toJsonObject} from '@subql/common';` +
  `const {writeFileSync} = require('fs');` +
  `const yaml = require('js-yaml');` +
  `const project = toJsonObject((require('${scriptPath}')).default);` +
  `const yamlOutput = yaml.dump(project);` +
  `writeFileSync('${outputPath}', '# // Auto-generated , DO NOT EDIT\\n' + yamlOutput);`;

export function findEndpointValue(manifest: string): string[] | null {
  // Regular expression to capture the value of endpoint
  const reg = /endpoint: \[\s*(.*?)\s*\],/s;

  // Extract the matched value
  const match = manifest.match(reg);

  // If a match was found, split the values by comma and return them
  return match ? match[1].split(',').map((s) => s.trim().replace(/"/g, '')) : null;
}

export async function readDefaults(projectPath: string): Promise<string[]> {
  const packageData = await fs.promises.readFile(`${projectPath}/package.json`);
  const currentPackage = JSON.parse(packageData.toString());
  const tsPath = path.join(`${projectPath}`, `project.ts`);
  const manifest = await fs.promises.readFile(tsPath, 'utf8');
  const currentProject = extractDefaults(manifest);
  return [
    currentProject.specVersion,
    currentProject.endpoint,
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

  // const data = parseDocument(manifest);
  // const clonedData = data.clone();

  // clonedData.set('description', project.description ?? data.get('description'));
  // clonedData.set('repository', project.repository ?? '');

  // const network = clonedData.get('network') as YAMLMap;
  // network.set('endpoint', project.endpoint);
  // clonedData.set('version', project.version);
  // clonedData.set('name', project.name);

  // i think this can go, its pretty much deprecated
  // if (isProjectSpecV1_0_0(project)) {
  //   network.set('chainId', project.chainId);
  // } else if (isProjectSpecV0_2_0(project)) {
  //   network.set('genesisHash', project.genesisHash);
  // }

  // await fs.promises.writeFile(yamlPath, clonedData.toString(), 'utf8');
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

export function validateEthereumProjectManifest(projectPath: string): boolean {
  const doc = loadFromJsonOrYaml(path.join(projectPath, 'project.yaml'));
  try {
    return !!parseEthereumProjectManifest(doc);
  } catch (e) {
    return false;
  }
}
