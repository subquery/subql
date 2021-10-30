// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {
  loadProjectManifest,
  ProjectManifestV0_2_0,
  ProjectManifestVersioned,
  ProjectNetworkV0_0_1,
} from '@subql/common';
import {cli} from 'cli-ux';
import yaml from 'js-yaml';
import {ProjectSpecV0_2_0} from '../types';
import {getGenesisHash} from './init-controller';

const MANIFEST_PATH = 'project.yaml';
const MANIFEST_V_0_0_1 = `project_0_0_1.yaml`;
const MANIFEST_V_0_2_0 = `project_0_2_0.yaml`;

export async function prepare(
  location: string,
  manifest: ProjectManifestVersioned
): Promise<[ProjectSpecV0_2_0, string]> {
  const packageData = await fs.promises.readFile(`${location}/package.json`, 'utf8');
  const jsonProjectData = JSON.parse(packageData);
  let chainTypesRelativePath: string;
  const project = {} as ProjectSpecV0_2_0;
  const projectV1Network = manifest.asV0_0_1.network;
  project.name = await cli.prompt('Project name', {default: jsonProjectData.name, required: true});
  project.version = await cli.prompt('Project version', {default: jsonProjectData.version, required: true});
  cli.action.start('Getting network genesis hash from endpoint');
  const genesisHash = await getGenesisHash(projectV1Network.endpoint);
  cli.action.stop();
  project.genesisHash = await cli.prompt('Please confirm network genesis hash', {default: genesisHash, required: true});
  if (
    projectV1Network.types ||
    projectV1Network.typesAlias ||
    projectV1Network.typesBundle ||
    projectV1Network.typesChain ||
    projectV1Network.typesSpec
  ) {
    chainTypesRelativePath = await cli.prompt('Project network chain types', {default: './types.yaml', required: true});
    const projectChainTypesPath = path.join(location, chainTypesRelativePath);
    //check if the file path is exist, if not create one
    if (fs.existsSync(projectChainTypesPath)) {
      if (await cli.confirm(`${projectChainTypesPath} already exist, do you want override it [Y/N]`)) {
        await createChainTypes(projectV1Network, projectChainTypesPath);
      }
    } else {
      await createChainTypes(projectV1Network, projectChainTypesPath);
    }
  }
  //Patch manifest here
  for (const dataSource of manifest.asV0_2_0.dataSources) {
    dataSource.mapping.file = await cli.prompt(
      `Please provide relative path for dataSource ${dataSource.name} 's mapping entry `,
      {default: './dist/index.js', required: true}
    );
    delete dataSource.name;
  }
  return [project, chainTypesRelativePath];
}

export async function migrate(
  projectPath: string,
  project: ProjectSpecV0_2_0,
  manifest: ProjectManifestVersioned,
  chainTypes?: string
): Promise<void> {
  const originManifestPath = path.join(projectPath, MANIFEST_PATH);
  const manifestV0_0_1 = path.join(projectPath, MANIFEST_V_0_0_1);
  const manifestV0_2_0 = path.join(projectPath, MANIFEST_V_0_2_0);

  try {
    const data = {} as ProjectManifestV0_2_0;
    data.specVersion = '0.2.0';
    data.name = project.name;
    data.version = project.version;
    data.description = manifest.asV0_2_0.description ?? '';
    data.repository = manifest.asV0_2_0.repository ?? '';
    data.schema = {file: manifest.asV0_0_1.schema};
    data.network = {
      genesisHash: project.genesisHash,
      endpoint: manifest.asV0_0_1.network.endpoint,
    };
    //TODO: check if validation rule is updated
    if (manifest.asV0_0_1.network.dictionary) {
      data.network.dictionary = manifest.asV0_0_1.network.dictionary;
    }
    if (chainTypes) {
      data.network.chaintypes = {file: chainTypes};
    }
    data.dataSources = manifest.asV0_2_0.dataSources;
    const newYaml = yaml.dump(data);
    await fs.promises.writeFile(manifestV0_2_0, newYaml, 'utf8');
  } catch (e) {
    throw new Error(`Fail to create manifest : ${e}`);
  }
  //validate before backup and conversion
  try {
    loadProjectManifest(manifestV0_2_0).isV0_2_0;
  } catch (e) {
    console.error(`${manifestV0_2_0} failed validation for manifest spec 0.2.0, \n ${e}`);
    const keep = await cli.confirm(`However, do you want keep ${manifestV0_2_0} for inspection before retry? [Y/N]`);
    if (keep) {
      process.exit(0);
    } else {
      await fs.promises.unlink(manifestV0_2_0);
      process.exit(0);
    }
  }
  //conversion
  await conversion(originManifestPath, manifestV0_0_1, manifestV0_2_0);
}

async function conversion(originManifestPath: string, manifestV0_0_1: string, manifestV0_2_0: string): Promise<void> {
  try {
    await fs.promises.rename(originManifestPath, manifestV0_0_1);
  } catch (e) {
    throw new Error(`Failed convert ${originManifestPath} to ${manifestV0_0_1},${e}`);
  }
  try {
    await fs.promises.rename(manifestV0_2_0, originManifestPath);
  } catch (e) {
    throw new Error(`Failed convert ${manifestV0_2_0} to ${originManifestPath},${e}`);
  }
}

export async function createChainTypes(projectV1Network: ProjectNetworkV0_0_1, path: string): Promise<void> {
  const data = {} as any; //TODO, find the correct type
  if (projectV1Network.types) data.types = projectV1Network.types;
  if (projectV1Network.typesBundle) data.typesBundle = projectV1Network.typesBundle;
  if (projectV1Network.typesAlias) data.typesAlias = projectV1Network.typesAlias;
  if (projectV1Network.typesChain) data.typesChain = projectV1Network.typesChain;
  if (projectV1Network.typesSpec) data.typesChain = projectV1Network.typesSpec;
  const chainTypes = yaml.dump(data);
  await fs.promises.writeFile(path, chainTypes, 'utf8');
}
