// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';
import yaml from 'js-yaml';
import rimraf from 'rimraf';
import simpleGit from 'simple-git';
import {ProjectSpec} from '../types';

const STARTER_PATH = 'https://github.com/OnFinality-io/subql-starter';

export async function createProject(localPath: string, project: ProjectSpec): Promise<void> {
  const projectPath = path.join(localPath, project.name);
  try {
    await simpleGit().clone(STARTER_PATH, projectPath);
  } catch (e) {
    throw new Error('Failed to clone starter template from git');
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
    await promisify(rimraf)(`${projectPath}/.git`);
  } catch (e) {
    throw new Error('Failed to remove .git from starter project');
  }
}

async function preparePackage(projectPath: string, project: ProjectSpec): Promise<void> {
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

async function prepareManifest(projectPath: string, project: ProjectSpec): Promise<void> {
  //load and write manifest(project.yaml)
  const yamlPath = path.join(`${projectPath}`, `project.yaml`);
  const manifest = await fs.promises.readFile(yamlPath, 'utf8');
  const data = yaml.safeLoadAll(manifest)[0];
  data.description = project.description ?? data.description;
  data.network.endpoint = project.endpoint;
  data.repository = project.repository ?? '';
  const newYaml = yaml.safeDump(data);
  await fs.promises.writeFile(yamlPath, newYaml, 'utf8');
}
