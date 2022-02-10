// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import {parseProjectManifest, ReaderFactory} from '@subql/common';
import {create} from 'ipfs-http-client';
import rimraf from 'rimraf';
import Build from '../commands/build';
import Codegen from '../commands/codegen';
import {isProjectSpecV0_0_1, ProjectSpecBase, ProjectSpecV0_0_1, ProjectSpecV0_2_0} from '../types';
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

const ipfsEndpoint = 'http://localhost:5001/api/v0';
//Replace your access token before test
const testAuth = 'MTA0MzE2NTc=JIwMq1cCzGIWddlskYRE';

jest.setTimeout(120000);

async function createTestProject(projectSpec: ProjectSpecBase): Promise<string> {
  const tmpdir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);
  const projectDir = path.join(tmpdir, projectSpec.name);

  const branch = isProjectSpecV0_0_1(projectSpec) ? 'v0.0.1' : 'v0.2.0';
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
  await Build.run(['-l', projectDir]);

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

  it('should not allow uploading a v0.0.1 spec version project', async () => {
    projectDir = await createTestProject(projectSpecV0_0_1);

    await expect(uploadToIpfs('', ipfsEndpoint, projectDir)).rejects.toBeDefined();
  });

  it('throw error when v0.0.1 try to deploy', async () => {
    projectDir = await createTestProject(projectSpecV0_0_1);
    const reader = await ReaderFactory.create(projectDir);
    const manifest = parseProjectManifest(await reader.getProjectSchema()).asImpl;
    expect(() => manifest.toDeployment()).toThrowError(
      'Manifest spec 0.0.1 is not support for deployment, please migrate to 0.2.0 or above'
    );
  });

  it('convert to deployment and removed descriptive field', async () => {
    projectDir = await createTestProject(projectSpecV0_2_0);
    const reader = await ReaderFactory.create(projectDir);
    const manifest = parseProjectManifest(await reader.getProjectSchema()).asImpl;
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
