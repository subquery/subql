// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync, readFileSync} from 'fs';
import path from 'path';
import {Command} from '@oclif/core';
import {MultichainProjectManifest} from '@subql/types-core';
import * as yaml from 'js-yaml';
import rimraf from 'rimraf';
import {buildManifestFromLocation, generateManifestFromTs} from './build';

describe('Manifest generation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should build ts manifest from multichain file', async () => {
    const projectPath = path.join(__dirname, '../../test/tsManifestTest/subquery-multichain.ts');
    await expect(
      buildManifestFromLocation(projectPath, {log: console.log} as unknown as Command)
    ).resolves.toBeDefined();
    expect(existsSync(path.join(projectPath, '../project1.yaml'))).toBe(true);
    expect(existsSync(path.join(projectPath, '../project2.yaml'))).toBe(true);
    expect(existsSync(path.join(projectPath, '../subquery-multichain.yaml'))).toBe(true);

    //ts files are replaced with yaml files
    const multichainContent = yaml.load(
      readFileSync(path.join(projectPath, '../subquery-multichain.yaml'), 'utf8')
    ) as MultichainProjectManifest;
    multichainContent.projects.forEach((project) => project.endsWith('.yaml'));

    rimraf.sync(path.join(projectPath, '../project1.yaml'));
    rimraf.sync(path.join(projectPath, '../project2.yaml'));
    rimraf.sync(path.join(projectPath, '../subquery-multichain.yaml'));
  }, 50000);
});
