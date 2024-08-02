// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import childProcess, {execSync} from 'child_process';
import fs from 'fs';
import * as path from 'path';
import {DEFAULT_MANIFEST, DEFAULT_TS_MANIFEST, loadFromJsonOrYaml, makeTempDir, NETWORK_FAMILY} from '@subql/common';
import {ProjectManifestV1_0_0, ProjectNetworkConfig} from '@subql/types-core';
import axios from 'axios';
import {copySync} from 'fs-extra';
import {rimraf} from 'rimraf';
import git from 'simple-git';
import {parseDocument, YAMLMap, YAMLSeq} from 'yaml';
import {BASE_TEMPLATE_URl, CAPTURE_CHAIN_ID_REG, CHAIN_ID_REG, ENDPOINT_REG} from '../constants';
import {loadDependency} from '../modulars';
import {isProjectSpecV1_0_0, ProjectSpecBase} from '../types';
import {
  defaultEnvDevelopLocalPath,
  defaultEnvDevelopPath,
  defaultEnvLocalPath,
  defaultEnvPath,
  defaultGitIgnorePath,
  defaultTSManifestPath,
  defaultYamlManifestPath,
  errorHandle,
  extractFromTs,
  findReplace,
  prepareDirPath,
  replaceArrayValueInTsManifest,
  validateEthereumTsManifest,
} from '../utils';

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

const axiosInstance = axios.create({baseURL: BASE_TEMPLATE_URl});

// GET /all
// https://templates.subquery.network/all
export async function fetchTemplates(): Promise<Template[]> {
  try {
    const res = await axiosInstance.get<{templates: Template[]}>('/all');

    return res.data.templates;
  } catch (e) {
    throw errorHandle(e, `Update to reach endpoint '${BASE_TEMPLATE_URl}/all`);
  }
}

// GET /networks
// https://templates.subquery.network/networks
export async function fetchNetworks(): Promise<Template[]> {
  try {
    const res = await axiosInstance.get<{results: Template[]}>('/networks');
    return res.data.results;
  } catch (e) {
    throw errorHandle(e, `Update to reach endpoint '${BASE_TEMPLATE_URl}/networks`);
  }
}

// The family query param must be an exact case-insensitive match otherwise an empty result will be returned
export async function fetchExampleProjects(
  familyCode: string,
  networkCode: string
): Promise<ExampleProjectInterface[]> {
  try {
    const res = await axiosInstance.get<{results: ExampleProjectInterface[]}>(`/networks/${familyCode}/${networkCode}`);
    return res.data.results;
  } catch (e) {
    throw errorHandle(e, `Update to reach endpoint ${familyCode}/${networkCode}`);
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
  let endpoint: ProjectNetworkConfig['endpoint'];
  const defaultTsPath = defaultTSManifestPath(projectPath);
  const defaultYamlPath = defaultYamlManifestPath(projectPath);

  if (fs.existsSync(defaultTsPath)) {
    const tsManifest = await fs.promises.readFile(defaultTsPath, 'utf8');
    const extractedTsValues = extractFromTs(tsManifest.toString(), {
      endpoint: ENDPOINT_REG,
    });

    endpoint = extractedTsValues.endpoint ?? [];
  } else {
    const yamlManifest = await fs.promises.readFile(defaultYamlPath, 'utf8');
    const extractedYamlValues = parseDocument(yamlManifest).toJS() as ProjectManifestV1_0_0;
    endpoint = extractedYamlValues.network.endpoint;
  }

  return [endpoint, currentPackage.author, currentPackage.description];
}

export async function prepare(projectPath: string, project: ProjectSpecBase): Promise<void> {
  try {
    await prepareEnv(projectPath, project);
  } catch (e) {
    throw new Error('Failed to prepare read or write .env file while preparing the project');
  }
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
    await rimraf(`${projectPath}/.git`);
  } catch (e) {
    throw new Error('Failed to remove .git from template project');
  }
  try {
    await prepareGitIgnore(projectPath);
  } catch (e) {
    throw new Error('Failed to prepare read or write .gitignore while preparing the project');
  }
}

export async function preparePackage(projectPath: string, project: ProjectSpecBase): Promise<void> {
  //load and write package.json
  const packageData = await fs.promises.readFile(`${projectPath}/package.json`);
  const currentPackage = JSON.parse(packageData.toString());
  currentPackage.name = project.name;
  currentPackage.description = project.description ?? currentPackage.description;
  currentPackage.author = project.author;
  //add build and develop scripts
  currentPackage.scripts = {
    ...currentPackage.scripts,
    build: 'subql codegen && subql build',
    'build:develop': 'NODE_ENV=develop subql codegen && NODE_ENV=develop subql build',
  };
  //add dotenv package for env file support
  currentPackage.devDependencies = {
    ...currentPackage.devDependencies,
    dotenv: 'latest',
  };
  const newPackage = JSON.stringify(currentPackage, null, 2);
  await fs.promises.writeFile(`${projectPath}/package.json`, newPackage, 'utf8');
}

export async function prepareManifest(projectPath: string, project: ProjectSpecBase): Promise<void> {
  //load and write manifest(project.ts/project.yaml)
  const tsPath = defaultTSManifestPath(projectPath);
  const yamlPath = defaultYamlManifestPath(projectPath);
  let manifestData: string;

  const isTs = fs.existsSync(tsPath);

  if (isTs) {
    const tsManifest = (await fs.promises.readFile(tsPath, 'utf8')).toString();
    //adding env config for endpoint.
    const formattedEndpoint = `process.env.ENDPOINT!?.split(',') as string[] | string`;
    const endpointUpdatedManifestData = findReplace(tsManifest, ENDPOINT_REG, `endpoint: ${formattedEndpoint}`);
    const chainIdUpdatedManifestData = findReplace(
      endpointUpdatedManifestData,
      CHAIN_ID_REG,
      `chainId: process.env.CHAIN_ID!`
    );
    manifestData = addDotEnvConfigCode(chainIdUpdatedManifestData);
  } else {
    //load and write manifest(project.yaml)
    const yamlManifest = await fs.promises.readFile(yamlPath, 'utf8');
    const data = parseDocument(yamlManifest);
    const clonedData = data.clone();

    const network = clonedData.get('network') as YAMLMap;
    network.set('endpoint', project.endpoint);
    clonedData.set('name', project.name);
    if (isProjectSpecV1_0_0(project)) {
      network.set('chainId', project.chainId);
    }
    manifestData = clonedData.toString();
  }
  await fs.promises.writeFile(isTs ? tsPath : yamlPath, manifestData, 'utf8');
}

export function addDotEnvConfigCode(manifestData: string): string {
  // add dotenv config after imports in project.ts file
  let snippetCodeIndex = -1;
  const manifestSections = manifestData.split('\n');
  for (let i = 0; i < manifestSections.length; i++) {
    if (manifestSections[i].trim() === '') {
      snippetCodeIndex = i + 1;
      break;
    }
  }

  if (snippetCodeIndex === -1) {
    snippetCodeIndex = 0;
  }

  const envConfigCodeSnippet = `
import * as dotenv from 'dotenv';
import path from 'path';

const mode = process.env.NODE_ENV || 'production';

// Load the appropriate .env file
const dotenvPath = path.resolve(__dirname, \`.env\${mode !== 'production' ? \`.$\{mode}\` : ''}\`);
dotenv.config({ path: dotenvPath });
`;

  // Inserting the env configuration code in project.ts
  const updatedTsProject = `${
    manifestSections.slice(0, snippetCodeIndex).join('\n') + envConfigCodeSnippet
  }\n${manifestSections.slice(snippetCodeIndex).join('\n')}`;
  return updatedTsProject;
}

export async function prepareEnv(projectPath: string, project: ProjectSpecBase): Promise<void> {
  //load and write manifest(project.ts/project.yaml)
  const envPath = defaultEnvPath(projectPath);
  const envDevelopPath = defaultEnvDevelopPath(projectPath);
  const envLocalPath = defaultEnvLocalPath(projectPath);
  const envDevelopLocalPath = defaultEnvDevelopLocalPath(projectPath);

  let chainId;
  if (isProjectSpecV1_0_0(project)) {
    chainId = project.chainId;
  } else {
    const tsPath = defaultTSManifestPath(projectPath);
    const tsManifest = (await fs.promises.readFile(tsPath, 'utf8')).toString();

    const match = tsManifest.match(CAPTURE_CHAIN_ID_REG);
    if (match) {
      chainId = match[2];
    }
  }

  //adding env configs
  const envData = `ENDPOINT=${project.endpoint}\nCHAIN_ID=${chainId}`;
  await fs.promises.writeFile(envPath, envData, 'utf8');
  await fs.promises.writeFile(envDevelopPath, envData, 'utf8');
  await fs.promises.writeFile(envLocalPath, envData, 'utf8');
  await fs.promises.writeFile(envDevelopLocalPath, envData, 'utf8');
}

export async function prepareGitIgnore(projectPath: string): Promise<void> {
  //load and write .gitignore
  const gitIgnorePath = defaultGitIgnorePath(projectPath);
  const isGitIgnore = fs.existsSync(gitIgnorePath);

  if (isGitIgnore) {
    let gitIgnoreManifest = (await fs.promises.readFile(gitIgnorePath, 'utf8')).toString();
    //add local .env files in .gitignore
    gitIgnoreManifest += `\n# ENV local files\n.env.local\n.env.develop.local`;
    await fs.promises.writeFile(gitIgnorePath, gitIgnoreManifest, 'utf8');
  }
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

  const defaultTsPath = defaultTSManifestPath(projectPath);

  try {
    //  clean dataSources
    if (fs.existsSync(defaultTsPath)) {
      // ts check should be first
      await prepareProjectScaffoldTS(defaultTsPath);
    } else {
      await prepareProjectScaffoldYAML(defaultYamlManifestPath(projectPath));
    }
  } catch (e) {
    throw new Error('Failed to prepare project scaffold');
  }

  // remove handler file from index.ts
  fs.truncateSync(path.join(projectPath, 'src/index.ts'), 0);
}

async function prepareProjectScaffoldTS(defaultTsPath: string): Promise<void> {
  const manifest = await fs.promises.readFile(defaultTsPath, 'utf8');
  const updateManifest = replaceArrayValueInTsManifest(manifest, 'dataSources', '[]');
  await fs.promises.writeFile(defaultTsPath, updateManifest, 'utf8');
}

async function prepareProjectScaffoldYAML(defaultYamlPath: string): Promise<void> {
  const manifest = parseDocument(await fs.promises.readFile(defaultYamlPath, 'utf8'));
  manifest.set('dataSources', new YAMLSeq());
  await fs.promises.writeFile(defaultYamlPath, manifest.toString(), 'utf8');
}

export async function validateEthereumProjectManifest(projectPath: string): Promise<boolean> {
  let manifest: any;
  const isTs = fs.existsSync(path.join(projectPath, DEFAULT_TS_MANIFEST));
  if (isTs) {
    manifest = (await fs.promises.readFile(path.join(projectPath, DEFAULT_TS_MANIFEST), 'utf8')).toString();
  } else {
    manifest = loadFromJsonOrYaml(path.join(projectPath, DEFAULT_MANIFEST));
  }
  try {
    return isTs
      ? validateEthereumTsManifest(manifest)
      : !!loadDependency(NETWORK_FAMILY.ethereum).parseProjectManifest(manifest);
  } catch (e) {
    return false;
  }
}
