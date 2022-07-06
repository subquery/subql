// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import rimraf from 'rimraf';
import {createTestProject, projectSpecV1_0_0} from '../controller/publish-controller.spec';
import Publish from './publish';

describe('Intergration test - Publish', () => {
  let projectDir: string;

  afterEach(async () => {
    try {
      await promisify(rimraf)(projectDir);
    } catch (e) {
      console.warn('Failed to clean up tmp dir after test');
    }
  });

  it('create ipfsCID file stored in local', async () => {
    projectDir = await createTestProject(projectSpecV1_0_0);
    await Publish.run(['-f', projectDir]);
    const cidFile = path.resolve(projectDir, '.project-cid');
    const fileExists = fs.existsSync(cidFile);
    const IPFScontent = await fs.promises.readFile(cidFile, 'utf8');
    expect(IPFScontent).toBeDefined();
    expect(fileExists).toBeTruthy();
  });
});
