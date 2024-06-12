// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {DEFAULT_TS_MANIFEST} from '@subql/common';
import git from 'simple-git';
import {ENDPOINT_REG} from '../constants';
import {extractFromTs, findReplace, validateEthereumTsManifest} from '../utils';
import {
  cloneProjectGit,
  fetchExampleProjects,
  fetchNetworks,
  fetchTemplates,
  prepareManifest,
  preparePackage,
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
  const projectPath = path.join(__dirname, '../../test/schemaTest/');
  let originalManifest: string;
  let originalPackage: string;
  beforeAll(async () => {
    originalManifest = (await fs.promises.readFile(`${projectPath}/${DEFAULT_TS_MANIFEST}`)).toString();
    originalPackage = (await fs.promises.readFile(`${projectPath}/package.json`)).toString();
  });

  afterAll(async () => {
    // resort original after the test
    await fs.promises.writeFile(path.join(projectPath, DEFAULT_TS_MANIFEST), originalManifest);
    await fs.promises.writeFile(path.join(projectPath, 'package.json'), originalPackage);
  });
  it('throw error when git clone failed', async () => {
    const tempPath = await makeTempDir();
    (git().clone as jest.Mock).mockImplementationOnce((cb) => {
      cb(new Error());
    });
    await expect(cloneProjectGit(tempPath, projectSpec.name, 'invalid_url', 'invalid_branch')).rejects.toThrow(
      /Failed to clone starter template from git/
    );
  });
  it('validate ethereum project manifest', async () => {
    const projectPath_eth = path.join(__dirname, '../../test/abiTest1');
    await expect(validateEthereumProjectManifest(projectPath_eth)).resolves.toBe(true);
    await expect(validateEthereumProjectManifest(projectPath)).resolves.toBe(false);
  });

  // These tests are disabled because they can interfere with the service
  it.skip('fetch templates', async () => {
    expect((await fetchTemplates()).length).toBeGreaterThan(0);
  });

  it.skip('fetch networks', async () => {
    expect((await fetchNetworks()).length).toBeGreaterThan(0);
  });

  it.skip('fetch example projects', async () => {
    expect((await fetchExampleProjects('evm', '1')).length).toBeGreaterThan(0);
  });

  it('readDefaults using regex', async () => {
    const manifest = (
      await fs.promises.readFile(path.join(__dirname, `../../test/schemaTest/${DEFAULT_TS_MANIFEST}`))
    ).toString();
    expect(
      extractFromTs(manifest, {
        endpoint: ENDPOINT_REG,
      })
    ).toStrictEqual({
      endpoint: ['wss://acala-polkadot.api.onfinality.io/public-ws', 'wss://acala-rpc-0.aca-api.network'],
    });
  });
  it('Ensure regex correctness for ENDPOINT_REG', () => {
    expect(
      extractFromTs(`endpoint: 'wss://acala-polkadot.api.onfinality.io/public-ws'`, {
        endpoint: ENDPOINT_REG,
      })
    ).toStrictEqual({
      endpoint: ['wss://acala-polkadot.api.onfinality.io/public-ws'],
    });
    expect(
      extractFromTs('endpoint: `wss://acala-polkadot.api.onfinality.io/public-ws`', {
        endpoint: ENDPOINT_REG,
      })
    ).toStrictEqual({
      endpoint: ['wss://acala-polkadot.api.onfinality.io/public-ws'],
    });
    expect(
      extractFromTs('endpoint: [`wss://acala-polkadot.api.onfinality.io/public-ws`]', {
        endpoint: ENDPOINT_REG,
      })
    ).toStrictEqual({
      endpoint: ['wss://acala-polkadot.api.onfinality.io/public-ws'],
    });
    expect(
      extractFromTs(
        "endpoint: [`wss://acala-polkadot.api.onfinality.io/public-ws`, 'wss://acala-polkadot.api.onfinality.io/public-ws']",
        {
          endpoint: ENDPOINT_REG,
        }
      )
    ).toStrictEqual({
      endpoint: [
        'wss://acala-polkadot.api.onfinality.io/public-ws',
        'wss://acala-polkadot.api.onfinality.io/public-ws',
      ],
    });
  });
  it('findReplace using regex', async () => {
    const manifest = (
      await fs.promises.readFile(path.join(__dirname, `../../test/schemaTest/${DEFAULT_TS_MANIFEST}`))
    ).toString();
    const v = findReplace(manifest, ENDPOINT_REG, "endpoint: ['wss://acala-polkadot.api.onfinality.io/public-ws']");

    expect(
      extractFromTs(v, {
        endpoint: ENDPOINT_REG,
      })
    ).toStrictEqual({endpoint: ['wss://acala-polkadot.api.onfinality.io/public-ws']});
  });
  it('findReplace with string endpoints', async () => {
    const manifest = (
      await fs.promises.readFile(path.join(__dirname, `../../test/schemaTest/${DEFAULT_TS_MANIFEST}`))
    ).toString();
    const v = findReplace(manifest, ENDPOINT_REG, "endpoint: 'wss://acala-polkadot.api.onfinality.io/public-ws'");

    expect(
      extractFromTs(v, {
        endpoint: ENDPOINT_REG,
      })
    ).toStrictEqual({endpoint: ['wss://acala-polkadot.api.onfinality.io/public-ws']});
  });
  it('able to extract string endpoints', () => {
    expect(
      extractFromTs(
        `
      endpoint: 'wss://aaa'
    `,
        {endpoint: ENDPOINT_REG}
      )
    ).toStrictEqual({endpoint: ['wss://aaa']});
  });
  it('Ensure prepareManifest and preparePackage correctness for project.ts', async () => {
    const project = {
      name: 'test-1',
      endpoint: ['https://zzz', 'https://bbb'],
      author: 'bz888',
      description: 'tester project',
    };

    await prepareManifest(projectPath, project);
    await preparePackage(projectPath, project);

    const packageData = await fs.promises.readFile(`${projectPath}/package.json`);
    const projectPackage = JSON.parse(packageData.toString());

    expect(projectPackage.name).toBe(project.name);
    expect(projectPackage.description).toBe(project.description);
    expect(projectPackage.author).toBe(project.author);

    const updatedManifest = await fs.promises.readFile(`${projectPath}/${DEFAULT_TS_MANIFEST}`);
    expect(originalManifest).not.toBe(updatedManifest.toString());
    expect(originalPackage).not.toBe(packageData.toString());
  });
  it('Validate validateEthereumTsManifest', () => {
    const passingManifest = `import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
  SubstrateProject,
} from '@subql/types-ethereum';
  runner:{ node: '@subql/node-ethereum' }`;
    const failingManifest = `import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
  SubstrateProject,
} from '@subql/types';
  runner:{ node: '@subql/node' }`;
    expect(validateEthereumTsManifest(passingManifest)).toBe(true);
    expect(validateEthereumTsManifest(failingManifest)).toBe(false);
  });
});
