// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import {ReaderFactory} from '@subql/common';
import {parseSubstrateProjectManifest, ProjectManifestV1_0_0Impl} from '@subql/common-substrate';
import {create} from 'ipfs-http-client';
import rimraf from 'rimraf';
import Build from '../commands/build';
import Codegen from '../commands/codegen';
import Publish from '../commands/publish';
import {
  isProjectSpecV0_0_1,
  isProjectSpecV1_0_0,
  ProjectSpecBase,
  ProjectSpecV0_0_1,
  ProjectSpecV0_2_0,
  ProjectSpecV1_0_0,
} from '../types';
import {cloneProjectGit, prepare} from './init-controller';
import {uploadFile, uploadToIpfs} from './publish-controller';

const projectSpecV0_0_1: ProjectSpecV0_0_1 = {
  name: 'mocked_starter',
  repository: '',
  endpoint: 'wss://rpc.polkadot.io/public-ws',
  author: 'jay',
  description: 'this is test for init controller',
  version: '',
  license: '',
};

const projectSpecV0_2_0: ProjectSpecV0_2_0 = {
  name: 'mocked_starter',
  repository: '',
  genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  endpoint: 'wss://rpc.polkadot.io/public-ws',
  author: 'jay',
  description: 'this is test for init controller',
  version: '',
  license: '',
};

export const projectSpecV1_0_0: ProjectSpecV1_0_0 = {
  name: 'mocked_starter',
  repository: '',
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  endpoint: 'wss://rpc.polkadot.io/public-ws',
  author: 'jay',
  description: 'this is test for init controller',
  version: '',
  license: '',
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

const ipfsEndpoint = 'http://localhost:5001/api/v0';
// Replace/Update your access token when test locally
const testAuth = process.env.SUBQL_ACCESS_TOKEN;

jest.setTimeout(150000);

export async function createTestProject(projectSpec: ProjectSpecBase): Promise<string> {
  const tmpdir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);
  const projectDir = path.join(tmpdir, projectSpec.name);

  const branch = isProjectSpecV0_0_1(projectSpec) ? 'v0.0.1' : isProjectSpecV1_0_0(projectSpec) ? 'v1.0.0' : 'v0.2.0';
  const projectPath = await cloneProjectGit(
    tmpdir,
    projectSpec.name,
    'https://github.com/subquery/subql-starter',
    branch
  );
  await prepare(projectPath, projectSpec);

  // Install dependencies
  childProcess.execSync(`npm i`, {cwd: projectDir});

  await Codegen.run(['-l', projectDir]);
  await Build.run(['-f', projectDir]);

  return projectDir;
}

describe('Cli publish', () => {
  let projectDir: string;

  afterEach(async () => {
    try {
      await promisify(rimraf)(projectDir);
    } catch (e) {
      console.warn('Failed to clean up tmp dir after test');
    }
  });

  it('should not allow uploading a v0.0.1 spec version project', async () => {
    projectDir = await createTestProject(projectSpecV0_0_1);
    await expect(uploadToIpfs('', ipfsEndpoint, projectDir)).rejects.toBeDefined();
  });

  it(`upload file to ipfs`, async () => {
    // only enable when test locally
    const ipfs = create({url: ipfsEndpoint});
    //test string
    const cid = await uploadFile('Test for upload string to ipfs', testAuth);
    console.log(`upload file cid: ${cid}`);
    // test fs stream (project)
    projectDir = await createTestProject(projectSpecV0_2_0);
    const fsStream = fs.createReadStream(path.resolve(projectDir, 'project.yaml'));
    const cid2 = await uploadFile(fsStream, testAuth);
    console.log(`upload file cid: ${cid2}`);
  });

  it('should upload appropriate project to IPFS', async () => {
    projectDir = await createTestProject(projectSpecV0_2_0);
    const cid = await uploadToIpfs(projectDir, testAuth);
    expect(cid).toBeDefined();
    // validation no longer required, as it is deployment object been published
    // await expect(Validate.run(['-l', cid, '--ipfs', ipfsEndpoint])).resolves.toBe(undefined);
  });
  // 1
  //QmdR5cpNkRThCAW3t221z9zKhASuGnfgDVD4xhrv7ZsSb4

  // 2
  //QmcmCfxzE2V4K9mUd4q2yH3JjqWd5n88hiYsocnn2QBVzL

  // print out directory of the project
  it('upload project from a manifest', async () => {
    projectDir = await createTestProject(projectSpecV0_2_0);
    const manifestPath = path.resolve(projectDir, 'project.yaml');
    const testManifestPath = path.resolve(projectDir, 'test.yaml');
    fs.renameSync(manifestPath, testManifestPath);
    await Publish.run(['-f', testManifestPath]);
  });

  it('should not allow uploading a v0.0.1 spec version project', async () => {
    projectDir = await createTestProject(projectSpecV0_0_1);
    await expect(uploadToIpfs('', ipfsEndpoint, projectDir)).rejects.toBeDefined();
  });

  it('throw error when v0.0.1 try to deploy', async () => {
    projectDir = await createTestProject(projectSpecV0_0_1);
    const reader = await ReaderFactory.create(projectDir);
    const manifest = parseSubstrateProjectManifest(await reader.getProjectSchema()).asImpl;
    expect(() => manifest.toDeployment()).toThrowError(
      'Manifest spec 0.0.1 is not support for deployment, please migrate to 0.2.0 or above'
    );
  });

  it('v1.0.0 should deploy', async () => {
    projectDir = await createTestProject(projectSpecV1_0_0);
    const reader = await ReaderFactory.create(projectDir);
    const manifest = parseSubstrateProjectManifest(await reader.getProjectSchema()).asImpl;
    expect((manifest as ProjectManifestV1_0_0Impl).runner).toBeDefined();
  });

  it('convert to deployment and removed descriptive field', async () => {
    projectDir = await createTestProject(projectSpecV0_2_0);
    const reader = await ReaderFactory.create(projectDir);
    const manifest = parseSubstrateProjectManifest(await reader.getProjectSchema()).asImpl;
    const deployment = manifest.toDeployment();
    expect(deployment).not.toContain('name');
    expect(deployment).not.toContain('author');
    expect(deployment).not.toContain('endpoint');
    expect(deployment).not.toContain('dictionary');
    expect(deployment).not.toContain('description');
    expect(deployment).not.toContain('repository');

    expect(deployment).toContain('genesisHash');
    expect(deployment).toContain('specVersion');
    expect(deployment).toContain('dataSources');
  });
});
