// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {extractDefaults, findReplace} from '@subql/common';
import git from 'simple-git';
import {
  cloneProjectGit,
  fetchExampleProjects,
  fetchNetworks,
  fetchTemplates,
  validateEthereumProjectManifest,
} from './init-controller';

jest.mock('simple-git', () => {
  const mGit = {
    clone: jest.fn(),
  };
  return jest.fn(() => mGit);
});

jest.setTimeout(30000);

async function makeTempDir() {
  const sep = path.sep;
  const tmpDir = os.tmpdir();
  const tempPath = await fs.promises.mkdtemp(`${tmpDir}${sep}`);
  return tempPath;
}
const projectSpec = {
  name: 'mocked_starter',
  repository: '',
  endpoint: 'wss://rpc.polkadot.io/public-ws',
  author: 'jay',
  description: 'this is test for init controller',
  version: '',
  license: '',
};

describe('Cli can create project (mocked)', () => {
  it('throw error when git clone failed', async () => {
    const tempPath = await makeTempDir();
    (git().clone as jest.Mock).mockImplementationOnce((cb) => {
      cb(new Error());
    });
    await expect(cloneProjectGit(tempPath, projectSpec.name, 'invalid_url', 'invalid_branch')).rejects.toThrow(
      /Failed to clone starter template from git/
    );
  });
  it('validate ethereum project manifest', () => {
    const projectPath = path.join(__dirname, '../../test/abiTest1');
    expect(validateEthereumProjectManifest(projectPath)).toBe(true);
  });
  it('fetch templates', async () => {
    expect((await fetchTemplates()).length).toBeGreaterThan(0);
  });
  it('fetch networks', async () => {
    expect((await fetchNetworks()).length).toBeGreaterThan(0);
  });
  it('fetch example projects', async () => {
    expect((await fetchExampleProjects('evm', '1')).length).toBeGreaterThan(0);
  });
  it('readDefaults using regex', async () => {
    const manifest = (await fs.promises.readFile(path.join(__dirname, '../../test/schemaTest/project.ts'))).toString();
    expect(extractDefaults(manifest)).toStrictEqual({
      specVersion: '1.0.0',
      endpoint: ['wss://acala-polkadot.api.onfinality.io/public-ws', 'wss://acala-rpc-0.aca-api.network'],
    });
  });
  it('findReplace using regex', async () => {
    const manifest = (await fs.promises.readFile(path.join(__dirname, '../../test/schemaTest/project.ts'))).toString();
    const v = findReplace(
      manifest,
      /endpoint:\s*\[\s*([\s\S]*?)\s*\]/,
      "endpoint: ['wss://acala-polkadot.api.onfinality.io/public-ws']"
    );

    console.log(v);
  });
});
