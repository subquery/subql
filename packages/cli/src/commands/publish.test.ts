// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {ReaderFactory} from '@subql/common';
import {parseSubstrateProjectManifest, ProjectManifestV1_0_0Impl} from '@subql/common-substrate';
// import Publish from '../commands/publish';
import {cloneProjectGit, prepare} from '../controller/init-controller';
import {isProjectSpecV0_0_1, isProjectSpecV1_0_0, ProjectSpecBase, ProjectSpecV1_0_0} from '../types';
// import {parseSubstrateProjectManifest, ProjectManifestV1_0_0Impl} from '@subql/common-substrate';

const projectSpecV1_0_0: ProjectSpecV1_0_0 = {
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

async function createTestProject(projectSpec: ProjectSpecBase): Promise<string> {
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

  return projectDir;
}

describe('Cli publish', () => {
  it('create ipfsCID file stored in local', async () => {
    const projectDir = await createTestProject(projectSpecV1_0_0);
    const reader = await ReaderFactory.create(projectDir);
    const manifest = parseSubstrateProjectManifest(await reader.getProjectSchema()).asImpl;
    expect((manifest as ProjectManifestV1_0_0Impl).runner).toBeDefined();
    // run publish before
    //
    // projectDir = await createTestProject(projectSpecV1_0_0);
    // // cid can it to a normal one
    // const cid = 'test-cid';
    // await createIPFS_file(projectDir, cid);
    const cidFile = path.resolve(projectDir, '.project-cid');
    const fileExists = fs.existsSync(cidFile);
    // const content = fs.readFile(cidFile, 'utf8', (err, data) => {
    //   if (err) throw err;
    //   return data;
    // });
    // expect(content).toBe(cid);
    expect(fileExists).toBeTruthy();
  });
});
