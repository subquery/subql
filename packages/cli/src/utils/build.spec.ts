// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync, readFileSync, writeFileSync} from 'fs';
import path from 'path';
import {MultichainProjectManifest} from '@subql/types-core';
import * as yaml from 'js-yaml';
import {rimraf} from 'rimraf';
import {buildManifestFromLocation} from './build';

describe('Manifest generation', () => {
  afterEach(() => {
    const projectPath = path.join(__dirname, '../../test/tsManifestTest');
    rimraf.sync(path.join(projectPath, 'project1.yaml'));
    rimraf.sync(path.join(projectPath, 'subquery-multichain2.yaml'));
    rimraf.sync(path.join(projectPath, 'project2.yaml'));
    rimraf.sync(path.join(projectPath, 'subquery-multichain.yaml'));
    rimraf.sync(path.join(projectPath, 'subquery-multichain3.yaml'));
  });

  it('should build ts manifest from multichain file', async () => {
    const projectPath = path.join(__dirname, '../../test/tsManifestTest/subquery-multichain.ts');
    await expect(buildManifestFromLocation(projectPath, console.log.bind(console))).resolves.toBeDefined();
    expect(existsSync(path.join(projectPath, '../project1.yaml'))).toBe(true);
    expect(existsSync(path.join(projectPath, '../project2.yaml'))).toBe(true);
    expect(existsSync(path.join(projectPath, '../subquery-multichain.yaml'))).toBe(true);

    //ts files are replaced with yaml files
    const multichainContent = yaml.load(
      readFileSync(path.join(projectPath, '../subquery-multichain.yaml'), 'utf8')
    ) as MultichainProjectManifest;
    multichainContent.projects.forEach((project) => project.endsWith('.yaml'));
  }, 50000);

  it('throws error on unknown file in multichain manifest', async () => {
    const projectPath = path.join(__dirname, '../../test/tsManifestTest/subquery-multichain2.ts');
    await expect(buildManifestFromLocation(projectPath, console.log.bind(console))).rejects.toThrow();
  }, 50000);

  it('allows both ts and yaml file in multichain manifest', async () => {
    const projectPath = path.join(__dirname, '../../test/tsManifestTest/subquery-multichain3.ts');
    await expect(buildManifestFromLocation(projectPath, console.log.bind(console))).resolves.toBeDefined();
    expect(existsSync(path.join(projectPath, '../project1.yaml'))).toBe(true);
    expect(existsSync(path.join(projectPath, '../project3.yaml'))).toBe(true);
    expect(existsSync(path.join(projectPath, '../subquery-multichain3.yaml'))).toBe(true);

    //ts files are replaced with yaml files
    const multichainContent = yaml.load(
      readFileSync(path.join(projectPath, '../subquery-multichain3.yaml'), 'utf8')
    ) as MultichainProjectManifest;
    multichainContent.projects.forEach((project) => project.endsWith('.yaml'));
  }, 50000);

  it('should build ts manifest from yaml multichain file', async () => {
    const projectPath = path.join(__dirname, '../../test/tsManifestTest/subquery-multichain4.yaml');
    await expect(buildManifestFromLocation(projectPath, console.log.bind(console))).resolves.toBeDefined();
    expect(existsSync(path.join(projectPath, '../project1.yaml'))).toBe(true);
    expect(existsSync(path.join(projectPath, '../project2.yaml'))).toBe(true);

    //ts files are replaced with yaml files
    const multichainContent = yaml.load(
      readFileSync(path.join(projectPath, '../subquery-multichain4.yaml'), 'utf8')
    ) as MultichainProjectManifest;
    multichainContent.projects.forEach((project) => expect(project.endsWith('.yaml')).toBe(true));

    //revert yaml to ts
    multichainContent.projects = multichainContent.projects.map((project) => project.replace('.yaml', '.ts'));

    writeFileSync(path.join(projectPath, '../subquery-multichain4.yaml'), yaml.dump(multichainContent));
  }, 50000);
});
