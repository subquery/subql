// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import rimraf from 'rimraf';
import {createProject} from './init-controller';
const projectName = 'mockStarterProject';

// async
const fileExists = async (file) => {
  return new Promise((resolve, reject) => {
    fs.access(file, fs.constants.F_OK, (err) => {
      err ? reject(err) : resolve(true);
    });
  });
};

describe('Cli can create project', () => {
  beforeEach(async () => {
    await new Promise((resolve) => rimraf(`${projectName}`, resolve));
  });

  afterEach(async () => {
    await new Promise((resolve) => rimraf(`${projectName}`, resolve));
  });

  it('should resolves when starter project successful created', async () => {
    await createProject(projectName);
    await expect(fileExists(`./${projectName}`)).resolves.toEqual(true);
  });

  it('throw error if same name directory exists', async () => {
    fs.mkdirSync(`./${projectName}`);
    await expect(createProject(projectName)).rejects.toThrow();
  });

  it('throw error if .git exists in starter project', async () => {
    await createProject(projectName);
    await expect(fileExists(`./${projectName}/.git`)).rejects.toThrow();
  });
});
