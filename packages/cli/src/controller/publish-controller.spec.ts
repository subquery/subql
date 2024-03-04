// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import {DEFAULT_MANIFEST, IPFS_WRITE_ENDPOINT, mapToObject, ReaderFactory, toJsonObject} from '@subql/common';
import {parseSubstrateProjectManifest, ProjectManifestV1_0_0Impl} from '@subql/common-substrate';
import {create, CID} from 'ipfs-http-client';
import rimraf from 'rimraf';
import Build from '../commands/build';
import Codegen from '../commands/codegen';
import Publish from '../commands/publish';
import {ProjectSpecBase, ProjectSpecV0_0_1, ProjectSpecV0_2_0, ProjectSpecV1_0_0} from '../types';
import {cloneProjectTemplate, fetchExampleProjects, prepare} from './init-controller';
import {uploadFile, uploadToIpfs} from './publish-controller';

const projectSpecV0_0_1: ProjectSpecV0_0_1 = {
  name: 'mocked_starter',
  endpoint: 'wss://rpc.polkadot.io/public-ws',
  author: 'jay',
  description: 'this is test for init controller',
};

const projectSpecV0_2_0: ProjectSpecV0_2_0 = {
  name: 'mocked_starter',
  genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  endpoint: 'wss://rpc.polkadot.io/public-ws',
  author: 'jay',
  description: 'this is test for init controller',
};

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

const ipfsEndpoint = 'http://localhost:5001/api/v0';
// Replace/Update your access token when test locally
const testAuth = process.env.SUBQL_ACCESS_TOKEN;

jest.setTimeout(150000);

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

describe('Cli publish', () => {
  let projectDir: string;

  afterEach(async () => {
    try {
      if (!projectDir) return;
      await promisify(rimraf)(projectDir);
    } catch (e) {
      console.warn('Failed to clean up tmp dir after test', e);
    }
  });

  it('should not allow uploading a v0.0.1 spec version project', async () => {
    projectDir = await createTestProject(projectSpecV0_0_1);
    await expect(uploadToIpfs([''], ipfsEndpoint, projectDir)).rejects.toBeDefined();
  });

  it(`upload file to ipfs`, async () => {
    // only enable when test locally
    const ipfs = create({url: ipfsEndpoint});

    //test string
    const cid = await uploadFile(
      {path: '', content: 'Test for uploaaaaaad string to ipfsaaaa'},
      'MTA0MzE2NTc=HW6qsPzHCUWFwJD7iyJ7'
    );
    console.log(`upload file cid: ${cid}`);
  });

  it('should upload appropriate project to IPFS', async () => {
    projectDir = await createTestProject(projectSpecV0_2_0);
    const cid = await uploadToIpfs([projectDir], testAuth);
    expect(cid).toBeDefined();
    // validation no longer required, as it is deployment object been published
    // await expect(Validate.run(['-l', cid, '--ipfs', ipfsEndpoint])).resolves.toBe(undefined);
  });

  it('upload project from a manifest', async () => {
    projectDir = await createTestProject(projectSpecV0_2_0);
    const manifestPath = path.resolve(projectDir, DEFAULT_MANIFEST);
    const testManifestPath = path.resolve(projectDir, 'test.yaml');
    fs.renameSync(manifestPath, testManifestPath);
    await expect(Publish.run(['-f', testManifestPath])).resolves.not.toThrow();
  });

  it('v1.0.0 should deploy', async () => {
    projectDir = await createTestProject(projectSpecV1_0_0);
    const reader = await ReaderFactory.create(projectDir);
    const manifest = parseSubstrateProjectManifest(await reader.getProjectSchema()).asImpl;
    expect((manifest as ProjectManifestV1_0_0Impl).runner).toBeDefined();
  });

  it('convert to deployment and removed descriptive field', async () => {
    projectDir = await createTestProject(projectSpecV1_0_0);
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

  it(`pin test`, async () => {
    // only enable when test locally
    const ipfsWrite = create({
      url: IPFS_WRITE_ENDPOINT,
      headers: {Authorization: `Bearer ${'MTA0MzE2NTc=HW6qsPzHCUWFwJD7iyJ7'}`},
    });
    const PIN_SERVICE = 'onfinality';

    const cid = CID.parse('QmVvX8wY78KzfbGaiPNaVamLB1Gs7f6HunZYFqojANS1cC');

    await ipfsWrite.pin.remote.add(cid, {service: PIN_SERVICE});
    return cid.toString();
  });
});
