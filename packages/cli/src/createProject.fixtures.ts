// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import fetch from 'cross-fetch';
import Build from './commands/build';
import Codegen from './commands/codegen';
import {cloneProjectTemplate, ExampleProjectInterface, prepare} from './controller/init-controller';
import {ProjectSpecV1_0_0} from './types';

const projectSpecV1_0_0: ProjectSpecV1_0_0 = {
  name: 'mocked_starter',
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  endpoint: 'wss://rpc.polkadot.io/public-ws',
  author: 'jay',
  description: 'this is test for init controller',
  runner: {
    node: {
      name: '@subql/node',
      version: '>=1.0.0',
    },
    query: {
      name: '@subql/query',
      version: '*',
    },
  },
};

const multiProjectSpecV1_0_0: ProjectSpecV1_0_0 = {
  name: 'multi_mocked_starter',
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  endpoint: 'https://arbitrum.llamarpc.com',
  author: 'jay',
  description: 'this is test for init controller',
  runner: {
    node: {
      name: '@subql/node-ethereum',
      version: '>=3.0.0',
    },
    query: {
      name: '@subql/query',
      version: '*',
    },
  },
};

async function getExampleProject(networkFamily: string, network: string): Promise<ExampleProjectInterface | undefined> {
  const res = await fetch('https://raw.githubusercontent.com/subquery/templates/main/dist/output.json');

  if (!res.ok) {
    throw new Error('Failed to get template');
  }

  const templates = (await res.json()) as {
    code: string;
    networks: {code: string; examples: ExampleProjectInterface[]}[];
  }[];
  return templates.find((t) => t.code === networkFamily)?.networks.find((n) => n.code === network)?.examples[0];
}

export async function createTestProject(): Promise<string> {
  const tmpdir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);
  const projectDir = path.join(tmpdir, projectSpecV1_0_0.name);

  const exampleProject = await getExampleProject('polkadot', 'polkadot');

  const projectPath = await cloneProjectTemplate(tmpdir, projectSpecV1_0_0.name, exampleProject);
  await prepare(projectPath, projectSpecV1_0_0);

  // Install dependencies
  childProcess.execSync(`npm i`, {cwd: projectDir});
  // Set test env to be develop mode, only limit to test
  process.env.NODE_ENV = 'develop';

  await Codegen.run(['-l', projectDir]);
  await Build.run(['-f', projectDir]);

  return projectDir;
}

export async function createMultiChainTestProject(): Promise<string> {
  const tmpdir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);
  const projectDir = path.join(tmpdir, multiProjectSpecV1_0_0.name);

  const exampleProject = await getExampleProject('multi', 'multi');

  const projectPath = await cloneProjectTemplate(tmpdir, multiProjectSpecV1_0_0.name, exampleProject);
  await prepare(projectPath, multiProjectSpecV1_0_0);

  // Install dependencies
  childProcess.execSync(`npm i`, {cwd: projectDir});
  // Set test env to be develop mode, only limit to test
  process.env.NODE_ENV = 'develop';

  await Codegen.run(['-l', projectDir]);
  await Build.run(['-f', projectDir]);

  return projectDir;
}
