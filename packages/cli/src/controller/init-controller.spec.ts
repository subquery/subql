// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import path from 'path';
import os from 'os';
const projectName = 'mockStarterProject';
import {createProject} from './init-controller';

// async
const fileExists = async (file) => {
  return new Promise((resolve, reject) => {
    fs.access(file, fs.constants.F_OK, (err) => {
      err ? reject(err) : resolve(true);
    });
  });
};

async function makeTempDir(): Promise<string> {
  const sep = path.sep;
  const tmpDir = os.tmpdir();
  return fs.mkdtempSync(`${tmpDir}${sep}`);
}

describe('Cli can create project', () => {
  it('should resolves when starter project successful created', async () => {
    const tempPath = await makeTempDir();
    process.chdir(tempPath);
    await createProject(projectName);
    await expect(fileExists(`./${projectName}`)).resolves.toEqual(true);
  });

  it('throw error if same name directory exists', async () => {
    const tempPath = await makeTempDir();
    process.chdir(tempPath);
    fs.mkdirSync(`./${projectName}`);
    await expect(createProject(projectName)).rejects.toThrow();
  });

  it('throw error if .git exists in starter project', async () => {
    const tempPath = await makeTempDir();
    process.chdir(tempPath);
    await createProject(projectName);
    await expect(fileExists(`${tempPath}/${projectName}/.git`)).rejects.toThrow();
  });
});
