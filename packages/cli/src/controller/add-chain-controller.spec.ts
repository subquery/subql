// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs, {existsSync} from 'fs';
import os from 'os';
import path from 'path';
import {DEFAULT_MULTICHAIN_MANIFEST} from '@subql/common';
import {MultichainProjectManifest, ProjectManifestV1_0_0} from '@subql/types-core';
import * as yaml from 'js-yaml';
import {rimraf} from 'rimraf';
import {YAMLSeq} from 'yaml';
import {loadMultichainManifest, validateAndAddChainManifest} from './add-chain-controller';

const multichainManifest: MultichainProjectManifest = {
  specVersion: '1.0.0',
  query: {
    name: '@subql/query',
    version: '*',
  },
  projects: ['./project-polkadot.yaml'],
};

const childChainManifest_1: ProjectManifestV1_0_0 = {
  specVersion: '1.0.0',
  version: '1.0.0',
  name: 'project-polkadot',
  runner: {
    node: {
      name: '@subql/node',
      version: '*',
    },
    query: {
      name: '@subql/query',
      version: '*',
    },
  },
  network: {
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    dictionary: 'https://api.subquery.network/sq/subquery/polkadot-dictionary',
  },
  schema: {
    file: './schema.graphql',
  },
  dataSources: [],
};

const childChainManifest_2: ProjectManifestV1_0_0 = {
  specVersion: '1.0.0',
  version: '1.0.0',
  name: 'project-kusama',
  runner: {
    node: {
      name: '@subql/node',
      version: '*',
    },
    query: {
      name: '@subql/query',
      version: '*',
    },
  },
  network: {
    chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    endpoint: 'wss://kusama.api.onfinality.io/public-ws',
    dictionary: 'https://api.subquery.network/sq/subquery/kusama-dictionary',
  },
  schema: {
    file: './schema.graphql',
  },
  dataSources: [],
};

const childChainManifest_2_wrongSchema: ProjectManifestV1_0_0 = {
  specVersion: '1.0.0',
  version: '1.0.0',
  name: 'project-kusama',
  runner: {
    node: {
      name: '@subql/node',
      version: '*',
    },
    query: {
      name: '@subql/query',
      version: '*',
    },
  },
  network: {
    chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    endpoint: 'wss://kusama.api.onfinality.io/public-ws',
    dictionary: 'https://api.subquery.network/sq/subquery/kusama-dictionary',
  },
  schema: {
    file: './schema_wrong.graphql',
  },
  dataSources: [],
};

async function createMultichainProject(
  multichainManifest: MultichainProjectManifest,
  childManifests: ProjectManifestV1_0_0[]
): Promise<string> {
  const tmpdir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);
  const projectDir = path.join(tmpdir, 'multichain');
  await fs.promises.mkdir(projectDir);
  // Create multichain manifest YAML
  const multichainYaml = yaml.dump(multichainManifest);
  if (!existsSync(projectDir)) {
    throw new Error(`${projectDir} does not exist`);
  }
  await fs.promises.writeFile(path.join(projectDir, DEFAULT_MULTICHAIN_MANIFEST), multichainYaml);

  // Create child manifest YAML files
  const childManifestPromises = childManifests.map(async (childManifest) => {
    const childManifestYaml = yaml.dump(childManifest);
    const fileName = `${childManifest.name}.yaml`;
    await fs.promises.writeFile(path.join(projectDir, fileName), childManifestYaml);
    return fileName;
  });

  await Promise.all(childManifestPromises);

  return projectDir;
}

async function createChildManifestFile(childManifest: ProjectManifestV1_0_0, projectDir: string): Promise<string> {
  const childManifestYaml = yaml.dump(childManifest);
  const fileName = `${childManifest.name}.yaml`;
  await fs.promises.writeFile(path.join(projectDir, fileName), childManifestYaml);
  return path.join(projectDir, fileName);
}

describe('MultiChain - ADD', () => {
  let projectDir: string;

  afterEach(async () => {
    try {
      await rimraf(projectDir);
    } catch (e) {
      console.warn('Failed to clean up tmp dir after test', e);
    }
  });

  it('can add chain to multichain manifest - valid schema paths', async () => {
    projectDir = await createMultichainProject(multichainManifest, [childChainManifest_1]);
    const chainFile = await createChildManifestFile(childChainManifest_2, projectDir);
    const multichainManifestPath = path.join(projectDir, DEFAULT_MULTICHAIN_MANIFEST);
    const multiManifest = loadMultichainManifest(multichainManifestPath);
    validateAndAddChainManifest(projectDir, chainFile, multiManifest);
    expect((multiManifest.get('projects') as YAMLSeq).get(1)).toEqual(`${childChainManifest_2.name}.yaml`);
  });

  it('cannot add chain to multichain manifest - invalid schema path', async () => {
    projectDir = await createMultichainProject(multichainManifest, [childChainManifest_1]);
    const chainFile = await createChildManifestFile(childChainManifest_2_wrongSchema, projectDir);
    const multichainManifestPath = path.join(projectDir, DEFAULT_MULTICHAIN_MANIFEST);
    const multiManifest = loadMultichainManifest(multichainManifestPath);
    expect(() => validateAndAddChainManifest(projectDir, chainFile, multiManifest)).toThrow();
  });
});
