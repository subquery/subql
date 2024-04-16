// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import {DEFAULT_MANIFEST, mapToObject, ReaderFactory, toJsonObject} from '@subql/common';
import {parseSubstrateProjectManifest} from '@subql/common-substrate';
import rimraf from 'rimraf';
import Build from '../commands/build';
import Codegen from '../commands/codegen';
import Publish from '../commands/publish';
import {ProjectSpecBase, ProjectSpecV1_0_0} from '../types';
import {cloneProjectTemplate, fetchExampleProjects, prepare} from './init-controller';
import {uploadToIpfs} from './publish-controller';

// eslint-disable-next-line jest/no-export
export const projectSpecV1_0_0: ProjectSpecV1_0_0 = {
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

// Replace/Update your access token when test locally
const testAuth = process.env.SUBQL_ACCESS_TOKEN;

// eslint-disable-next-line jest/no-export
export async function createTestProject(projectSpec: ProjectSpecBase): Promise<string> {
  const tmpdir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);
  const projectDir = path.join(tmpdir, projectSpec.name);
  const projects = await fetchExampleProjects('polkadot', 'polkadot');
  const projectPath = await cloneProjectTemplate(tmpdir, projectSpec.name, projects[0]);
  await prepare(projectPath, projectSpec);

  // Install dependencies
  childProcess.execSync(`npm i`, {cwd: projectDir});

  await Codegen.run(['-l', projectDir]);
  await Build.run(['-f', projectDir]);

  return projectDir;
}

jest.setTimeout(200_000); // 200s
describe('Cli publish', () => {
  let projectDir: string;

  beforeAll(async () => {
    console.log('Setting up test project');
    projectDir = await createTestProject(projectSpecV1_0_0);
  });

  afterAll(async () => {
    try {
      if (!projectDir) return;
      await promisify(rimraf)(projectDir);
    } catch (e) {
      console.warn('Failed to clean up tmp dir after test', e);
    }
  });

  it('should upload appropriate project to IPFS', async () => {
    const cid = await uploadToIpfs([projectDir], testAuth);
    expect(cid).toBeDefined();
  });

  it('upload project from a manifest', async () => {
    const manifestPath = path.resolve(projectDir, DEFAULT_MANIFEST);
    const testManifestPath = path.resolve(projectDir, 'test.yaml');
    fs.renameSync(manifestPath, testManifestPath);
    await expect(Publish.run(['-f', testManifestPath])).resolves.not.toThrow();
    // Revert file name to get other tests to pass
    fs.renameSync(testManifestPath, manifestPath);

    expect(fs.existsSync(path.resolve(projectDir, '.test-cid'))).toBeTruthy();
  });

  it('convert to deployment and removed descriptive field', async () => {
    const reader = await ReaderFactory.create(projectDir);
    const manifest = parseSubstrateProjectManifest(await reader.getProjectSchema());
    const deployment = manifest.toDeployment();
    expect(deployment).not.toContain('author');
    expect(deployment).not.toContain('endpoint');
    expect(deployment).not.toContain('dictionary');
    expect(deployment).not.toContain('description');
    expect(deployment).not.toContain('repository');

    expect(deployment).toContain('chainId');
    expect(deployment).toContain('specVersion');
    expect(deployment).toContain('dataSources');
  });

  it('convert js object to JSON object', () => {
    const mockMap = new Map<number | string, string>([
      [1, 'aaa'],
      ['2', 'bbb'],
    ]);
    expect(toJsonObject({map: mockMap, obj: {abc: 111}})).toStrictEqual({
      map: {'1': 'aaa', '2': 'bbb'},
      obj: {abc: 111},
    });
    expect(mapToObject(mockMap)).toStrictEqual({'1': 'aaa', '2': 'bbb'});
  });
});
