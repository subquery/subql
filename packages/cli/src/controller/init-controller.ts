// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import rimraf from 'rimraf';
import simpleGit, {SimpleGit} from 'simple-git';
const git: SimpleGit = simpleGit();

const starterPath = 'https://github.com/OnFinality-io/subql-starter';

export async function createProject(projectName: string): Promise<void> {
  const localPath = `${process.cwd()}/${projectName}`;
  try {
    await git.clone(starterPath, localPath);
    const packageData = fs.readFileSync(`${localPath}/package.json`);
    const currentPackage = JSON.parse(packageData.toString());
    currentPackage.name = projectName;
    const newPackage = JSON.stringify(currentPackage, null, 2);
    fs.writeFileSync(`${localPath}/package.json`, newPackage, 'utf8');
    rimraf(`${localPath}/.git`, function (err) {
      if (err) throw err;
    });
  } catch (e) {
    /* handle all errors here */
    console.error(e.message);
    process.exit(1);
  } finally {
    console.log(`Starter package: ${projectName} is ready`);
  }
}
