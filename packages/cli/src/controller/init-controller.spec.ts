// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import os from 'os';
import path from 'path';
import git from 'simple-git';
import {createProjectFromGit} from './init-controller';

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
    (git().clone as jest.Mock).mockImplementationOnce((cb) => cb(new Error()));
    await expect(await createProjectFromGit(tempPath, projectSpec, '')).rejects.toThrow(
      /Failed to clone starter template from git/
    );
  });
});
