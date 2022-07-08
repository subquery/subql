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

  it('overwrites any exisiting CID files', async () => {
    const initCID = 'QmWLxg7xV7ZWUyc7ZxZ8XuQQ7NmH8WQGXzg7VZ3QQNqF-testing';
    projectDir = await createTestProject(projectSpecV1_0_0);
    const cidFilePath = path.resolve(projectDir, '.project-cid');
    await fs.promises.writeFile(cidFilePath, initCID);
    await Publish.run(['-f', projectDir, '-o']);
    const cidValue = await fs.promises.readFile(cidFilePath, 'utf8');
    expect(initCID).not.toEqual(cidValue);
  });

  it('file name consistent with manfiest file name, if -f <manifest path> is used', async () => {
    projectDir = await createTestProject(projectSpecV1_0_0);
    const manifestPath = path.resolve(projectDir, 'project.yaml');
    const testManifestPath = path.resolve(projectDir, 'test.yaml');
    fs.renameSync(manifestPath, testManifestPath);
    await Publish.run(['-f', testManifestPath]);

    const cidFile = path.resolve(projectDir, '.test-cid');
    const fileExists = await fs.promises.stat(cidFile);
    expect(fileExists.isFile()).toBeTruthy();
  });

  it('create ipfsCID file stored in local with dictiory path', async () => {
    projectDir = await createTestProject(projectSpecV1_0_0);
    await Publish.run(['-f', projectDir]);
    const cidFile = path.resolve(projectDir, '.project-cid');
    const fileExists = fs.existsSync(cidFile);
    const IPFScontent = await fs.promises.readFile(cidFile, 'utf8');
    expect(IPFScontent).toBeDefined();
    expect(fileExists).toBeTruthy();
  });
});
