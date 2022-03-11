// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {ProjectManifestV1_0_0} from '@subql/common';
import {
  SubstrateProjectManifestVersioned,
  ProjectNetworkV0_0_1,
  ChainTypes,
  loadSubstrateProjectManifest,
} from '@subql/common-substrate';
import {loadTerraProjectManifest, TerraProjectManifestVersioned} from '@subql/common-terra';
import {cli} from 'cli-ux';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import {getGenesisHash} from '../jsonrpc';
import {ProjectSpecV1_0_0} from '../types';

const MANIFEST_PATH = 'project.yaml';
const MANIFEST_OLD = `project_old.yaml`;
const MANIFEST_V_1_0_0 = `project_1_0_0.yaml`;
const SUBSTRATE_NODE_NAME = '@subql/node';
const TERRA_NODE_NAME = '@subql/node-terra';
const DEFAULT_QUERY_NAME = '@subql/query';

export async function prepare(
  location: string,
  manifest: SubstrateProjectManifestVersioned | TerraProjectManifestVersioned
): Promise<[ProjectSpecV1_0_0, string]> {
  const packageData = await fs.promises.readFile(`${location}/package.json`, 'utf8');
  const jsonProjectData = JSON.parse(packageData);
  let chainTypesRelativePath: string;
  const project = {runner: {node: {}, query: {}}} as ProjectSpecV1_0_0;
  const projectNetwork =
    manifest instanceof SubstrateProjectManifestVersioned && manifest.isV0_0_1
      ? manifest.asV0_0_1.network
      : manifest.asV1_0_0.network;
  project.name = await cli.prompt('Project name', {default: jsonProjectData.name, required: true});
  project.version = await cli.prompt('Project version', {default: jsonProjectData.version, required: true});
  project.runner.node = await inquirer.prompt([
    {
      name: 'name', //equivalent to project.runner.node.name
      message: 'select Runner Node spec',
      type: 'list',
      choices: [{name: SUBSTRATE_NODE_NAME}, {name: TERRA_NODE_NAME}],
    },
  ]);
  project.runner.node.version = await cli.prompt('Runner node version', {required: true});
  project.runner.query = await inquirer.prompt([
    {
      name: 'name',
      message: 'select Runner Query spec',
      type: 'list',
      choices: [{name: DEFAULT_QUERY_NAME}],
    },
  ]);
  project.runner.query.version = await cli.prompt('Runner query version', {required: true});

  let genesisHash: string;
  if (project.runner.node.name === SUBSTRATE_NODE_NAME) {
    cli.action.start('Getting network genesis hash from endpoint for Chain ID');
    try {
      genesisHash = await getGenesisHash(projectNetwork.endpoint);
    } catch (e) {
      genesisHash = null;
    }
    cli.action.stop();
  }
  project.chainId = await cli.prompt('Please provide Chain ID', {default: genesisHash ?? null, required: true});

  if (manifest instanceof SubstrateProjectManifestVersioned && manifest.isV0_0_1) {
    const projectV1Network = manifest.asV0_0_1.network;
    if (
      projectV1Network.types ||
      projectV1Network.typesAlias ||
      projectV1Network.typesBundle ||
      projectV1Network.typesChain ||
      projectV1Network.typesSpec
    ) {
      chainTypesRelativePath = await cli.prompt('Please provide network chain types path', {
        default: './types.json',
        required: true,
      });
      const {ext} = path.parse(chainTypesRelativePath);
      if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') {
        throw new Error(`Extension ${ext} not supported`);
      }
      const projectChainTypesPath = path.join(location, chainTypesRelativePath);
      //check if the file path is exist, if not create one
      if (fs.existsSync(projectChainTypesPath)) {
        if (await cli.confirm(`${projectChainTypesPath} already exist, do you want override it [Y/N]`)) {
          await createChainTypes(projectV1Network, projectChainTypesPath, ext);
        }
      } else {
        await createChainTypes(projectV1Network, projectChainTypesPath, ext);
      }
    }
  }

  //Patch manifest here
  for (const dataSource of manifest.asV1_0_0.dataSources) {
    dataSource.mapping.file = await cli.prompt(
      `Please provide relative entry path for dataSource ${dataSource.name}'s mapping `,
      {
        default: jsonProjectData.main.toString().startsWith('./') ? jsonProjectData.main : `./${jsonProjectData.main}`,
        required: true,
      }
    );
    delete dataSource.name;
    const handlers = dataSource.mapping.handlers;
    delete dataSource.mapping.handlers; // adjust position
    dataSource.mapping.handlers = handlers;
  }
  return [project, chainTypesRelativePath];
}

function getDefaultNodeNameFromManifest(
  manifest: SubstrateProjectManifestVersioned | TerraProjectManifestVersioned
): string {
  if (manifest instanceof SubstrateProjectManifestVersioned) {
    return SUBSTRATE_NODE_NAME;
  } else if (manifest instanceof TerraProjectManifestVersioned) {
    return TERRA_NODE_NAME;
  }
}

export async function migrate(
  projectPath: string,
  project: ProjectSpecV1_0_0,
  manifest: SubstrateProjectManifestVersioned | TerraProjectManifestVersioned,
  chainTypes?: string
): Promise<void> {
  const originManifestPath = path.join(projectPath, MANIFEST_PATH);
  const manifestOld = path.join(projectPath, MANIFEST_OLD);
  const manifestV1_0_0 = path.join(projectPath, MANIFEST_V_1_0_0);

  try {
    const data = {} as ProjectManifestV1_0_0;
    data.specVersion = '1.0.0';
    data.name = project.name;
    data.version = project.version;
    data.runner = project.runner;
    data.description = manifest.asV1_0_0.description ?? '';
    data.repository = manifest.asV1_0_0.repository ?? '';
    if (manifest instanceof SubstrateProjectManifestVersioned) {
      data.schema = manifest.isV0_0_1 ? {file: manifest.asV0_0_1.schema} : manifest.asV1_0_0.schema;
    }
    data.network = {
      chainId: project.chainId,
      endpoint: manifest.asV1_0_0.network.endpoint,
    };
    if (manifest.asV1_0_0.network.dictionary) {
      data.network.dictionary = manifest.asV1_0_0.network.dictionary;
    }
    if (chainTypes) {
      data.network.chaintypes = {file: chainTypes};
    }
    data.dataSources = manifest.asV1_0_0.dataSources as any; //TODO, fix this type as extend BaseDataSource
    manifest instanceof SubstrateProjectManifestVersioned && manifest.asV1_0_0.templates
      ? (data.templates = manifest.asV1_0_0.templates)
      : delete data.templates;

    const newYaml = yaml.dump(data);
    await fs.promises.writeFile(manifestV1_0_0, newYaml, 'utf8');
  } catch (e) {
    throw new Error(`Fail to create manifest : ${e}`);
  }
  //validate before backup and conversion
  try {
    loadSubstrateProjectManifest(manifestV1_0_0).isV1_0_0;
  } catch (e) {
    try {
      loadTerraProjectManifest(manifestV1_0_0).isV1_0_0;
    } catch (e) {
      console.error(`${manifestV1_0_0} failed validation for manifest spec 1.0.0, \n ${e}`);
      const keep = await cli.confirm(`However, do you want keep ${manifestV1_0_0} for inspection before retry? [Y/N]`);
      if (keep) {
        process.exit(0);
      } else {
        await fs.promises.unlink(manifestV1_0_0);
        process.exit(0);
      }
    }
  }
  //conversion
  await conversion(originManifestPath, manifestOld, manifestV1_0_0);
}

async function conversion(originManifestPath: string, manifestOld: string, manifestV1_0_0: string): Promise<void> {
  try {
    await fs.promises.rename(originManifestPath, manifestOld);
  } catch (e) {
    throw new Error(`Failed convert ${originManifestPath} to ${manifestOld},${e}`);
  }
  try {
    await fs.promises.rename(manifestV1_0_0, originManifestPath);
  } catch (e) {
    throw new Error(`Failed convert ${manifestV1_0_0} to ${originManifestPath},${e}`);
  }
}

export async function createChainTypes(
  projectV1Network: ProjectNetworkV0_0_1,
  absolutePath: string,
  ext: string
): Promise<void> {
  const data = {} as ChainTypes;
  if (projectV1Network.types) data.types = projectV1Network.types;
  if (projectV1Network.typesBundle) data.typesBundle = projectV1Network.typesBundle;
  if (projectV1Network.typesAlias) data.typesAlias = projectV1Network.typesAlias;
  if (projectV1Network.typesChain) data.typesChain = projectV1Network.typesChain;
  if (projectV1Network.typesSpec) data.typesChain = projectV1Network.typesSpec;

  if (ext === '.json') {
    await fs.promises.writeFile(absolutePath, JSON.stringify(data, null, 2));
  } else {
    await fs.promises.writeFile(absolutePath, yaml.dump(data), 'utf8');
  }
  console.log(`* chainTypes is created`);
}
