// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {rimraf} from 'rimraf';
import {createTestProject} from '../createProject.fixtures';
import Publish from './publish';

jest.setTimeout(300_000); // 300s
describe('Intergration test - Publish', () => {
  let projectDir: string;

  beforeAll(async () => {
    projectDir = await createTestProject();
  });

  afterAll(async () => {
    try {
      if (!projectDir) return;
      await rimraf(projectDir);
    } catch (e) {
      console.warn('Failed to clean up tmp dir after test', e);
    }
  });

  it('overwrites any exisiting CID files', async () => {
    const initCID = 'QmWLxg7xV7ZWUyc7ZxZ8XuQQ7NmH8WQGXzg7VZ3QQNqF-testing';
    const cidFilePath = path.resolve(projectDir, '.project-cid');
    await fs.promises.writeFile(cidFilePath, initCID);
    await Publish.run(['-f', projectDir, '-o']);
    const cidValue = await fs.promises.readFile(cidFilePath, 'utf8');
    expect(initCID).not.toEqual(cidValue);
  });

  it('create ipfsCID file stored in local with dictiory path', async () => {
    await Publish.run(['-f', projectDir]);
    const cidFile = path.resolve(projectDir, '.project-cid');
    const fileExists = fs.existsSync(cidFile);
    const IPFScontent = await fs.promises.readFile(cidFile, 'utf8');
    expect(IPFScontent).toBeDefined();
    expect(fileExists).toBeTruthy();
  });

  // Run this last because it modifies the project
  it('file name consistent with manfiest file name, if -f <manifest path> is used', async () => {
    const manifestPath = path.resolve(projectDir, 'project.yaml');
    const testManifestPath = path.resolve(projectDir, 'test.yaml');
    fs.renameSync(manifestPath, testManifestPath);
    await Publish.run(['-f', testManifestPath]);

    const cidFile = path.resolve(projectDir, '.test-cid');
    const fileExists = await fs.promises.stat(cidFile);
    expect(fileExists.isFile()).toBeTruthy();
  });
});
