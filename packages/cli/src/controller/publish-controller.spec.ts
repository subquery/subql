// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import {loadSubstrateProjectManifest} from '@subql/common-substrate';
import rimraf from 'rimraf';
import Build from '../commands/build';
import Codegen from '../commands/codegen';
import Validate from '../commands/validate';
import {ProjectSpecBase, ProjectSpecV0_0_1, ProjectSpecV0_2_0} from '../types';
import {createProject} from './init-controller';
import {uploadToIpfs} from './publish-controller';

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
  author: 'jay',
  description: 'this is test for init controller',
  version: '',
  license: '',
  endpoint: 'wss://rpc.polkadot.io/public-ws',
};

const ipfsEndpoint = 'https://ipfs.thechainhub.com/api/v0';

jest.setTimeout(120000);

async function createTestProject(projectSpec: ProjectSpecBase): Promise<string> {
  const tmpdir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);
  const projectDir = path.join(tmpdir, projectSpec.name);

  await createProject(tmpdir, projectSpec);

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

    await expect(uploadToIpfs(ipfsEndpoint, projectDir)).rejects.toBeDefined();
  });

  it('should upload appropriate files to IPFS', async () => {
    projectDir = await createTestProject(projectSpecV0_2_0);
    const cid = await uploadToIpfs(ipfsEndpoint, projectDir);

    expect(cid).toBeDefined();
    await expect(Validate.run(['-l', cid, '--ipfs', ipfsEndpoint])).resolves.toBe(undefined);
  });

  it('should not allow uploading a v0.0.1 spec version project', async () => {
    projectDir = await createTestProject(projectSpecV0_0_1);

    await expect(uploadToIpfs(ipfsEndpoint, projectDir)).rejects.toBeDefined();
  });

  it('throw error when v0.0.1 try to deploy', async () => {
    projectDir = await createTestProject(projectSpecV0_0_1);
    const projectManifestPath = path.resolve(projectDir, 'project.yaml');
    const manifest = loadSubstrateProjectManifest(projectManifestPath).asImpl;
    expect(() => manifest.toDeployment()).toThrowError(
      'Manifest spec 0.0.1 is not support for deployment, please migrate to 0.2.0 or above'
    );
  });

  it('convert to deployment and removed descriptive field', async () => {
    projectDir = await createTestProject(projectSpecV0_2_0);
    const projectManifestPath = path.resolve(projectDir, 'project.yaml');
    const manifest = loadSubstrateProjectManifest(projectManifestPath).asImpl;
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
