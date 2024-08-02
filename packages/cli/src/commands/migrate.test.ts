// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {makeTempDir} from '@subql/common';
import {rimraf} from 'rimraf';
import {DEFAULT_SUBQL_MANIFEST} from '../constants';
import Migrate from './migrate';

jest.setTimeout(300_000); // 300s
describe('Intergration test - Migrate', () => {
  let projectDir: string;

  beforeAll(async () => {
    projectDir = await makeTempDir();
  });

  afterAll(async () => {
    try {
      if (!projectDir) return;
      await rimraf(projectDir);
    } catch (e) {
      console.warn('Failed to clean up tmp dir after test', e);
    }
  });

  it('could migrate a subgraph project from remote source', async () => {
    const graphProjectGit = 'https://github.com/graphprotocol/graph-tooling/tree/main/';
    const graphProjectSubDir = 'examples/ethereum-gravatar';
    await Migrate.run(['-f', graphProjectGit, '-d', graphProjectSubDir, '-o', projectDir]);
    const subqlManifest = await fs.promises.readFile(path.join(projectDir, DEFAULT_SUBQL_MANIFEST), 'utf8');
    expect(subqlManifest).toContain(`const project: EthereumProject`);
    expect(subqlManifest).toContain(`name: "example-ethereum-gravatar"`);
    expect(subqlManifest).toContain(`handler: "handleUpdatedGravatar"`);
  });
});
