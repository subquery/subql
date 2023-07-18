// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {makeTempDir} from '@subql/common';
import rimraf from 'rimraf';
import {parseDocument, Document} from 'yaml';
import {isProjectSpecV0_2_0, isProjectSpecV1_0_0, ProjectSpecBase} from '../types';
import {
  cloneProjectGit,
  cloneProjectTemplate,
  fetchTemplates,
  prepare,
  readDefaults,
  Template,
} from './init-controller';

async function testYAML(projectPath: string, project: ProjectSpecBase): Promise<{old: Document; new: Document}> {
  const yamlPath = path.join(`${projectPath}`, `project.yaml`);
  const manifest = await fs.promises.readFile(yamlPath, 'utf8');
  const data = parseDocument(manifest);

  const clonedData = data.clone();
  clonedData.set('description', project.description ?? data.get('description'));
  clonedData.set('repository', project.repository ?? '');

  // network type should be collection
  const network: any = clonedData.get('network');
  network.set('endpoint', 'http://def not real endpoint');
  clonedData.set('version', 'not real version');
  clonedData.set('name', 'not real name');

  if (isProjectSpecV1_0_0(project)) {
    network.set('chainId', 'random chainId');
  } else if (isProjectSpecV0_2_0(project)) {
    network.set('genesisHash', 'random genesisHash');
  }
  return {
    old: data,
    new: clonedData,
  };
}

// async
const fileExists = async (file: string): Promise<boolean> => {
  return new Promise<boolean>((resolve, reject) => {
    fs.access(file, fs.constants.F_OK, (err) => {
      err ? reject(err) : resolve(true);
    });
  });
};

jest.setTimeout(30000);

const projectSpec = {
  name: 'mocked_starter',
  repository: '',
  endpoint: 'wss://rpc.polkadot.io/public-ws',
  specVersion: '1.0.0',
  author: 'jay',
  description: 'this is test for init controller',
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  version: '',
  license: '',
};

describe('Cli can create project', () => {
  it('should resolve when starter project created via template', async () => {
    const tempPath = await makeTempDir();
    const templates = await fetchTemplates();
    const projectPath = await cloneProjectTemplate(tempPath, projectSpec.name, templates[0]);
    await prepare(projectPath, projectSpec);
    await expect(fileExists(path.join(tempPath, `${projectSpec.name}`))).resolves.toEqual(true);
  });

  it('should resolve when starter project created via git', async () => {
    const tempPath = await makeTempDir();
    const projectPath = await cloneProjectGit(
      tempPath,
      projectSpec.name,
      'https://github.com/subquery/subql-starter',
      'v1.0.0'
    );
    await prepare(projectPath, projectSpec);
    await expect(fileExists(path.join(tempPath, `${projectSpec.name}`))).resolves.toEqual(true);
  });

  it('throw error if .git exists in starter project', async () => {
    const tempPath = await makeTempDir();
    const templates = await fetchTemplates();
    const projectPath = await cloneProjectTemplate(tempPath, projectSpec.name, templates[0]);
    await prepare(projectPath, projectSpec);
    await expect(fileExists(path.join(tempPath, `${projectSpec.name}/.git`))).rejects.toThrow();
  });
  it('YAML contains comments', async () => {
    const tempPath = await makeTempDir();
    const templates = await fetchTemplates();
    const projectPath = await cloneProjectTemplate(tempPath, projectSpec.name, templates[0]);
    const output = await testYAML(projectPath, projectSpec);
    expect(output.new.toJS().network.chainId).toBe('random chainId');
    expect(output.new).not.toEqual(output.old);
    expect(output.new.toString()).toContain('# The genesis hash of the network (hash of block 0)');

    await promisify(rimraf)(tempPath);
  });

  it('prepare correctly applies project details', async () => {
    const tempPath = await makeTempDir();
    const templates = await fetchTemplates();
    const template = templates.find(({name}) => name.toLowerCase() === 'polkadot-starter');
    const projectPath = await cloneProjectTemplate(tempPath, projectSpec.name, template);
    await prepare(projectPath, projectSpec);
    const [specVersion, repository, endpoint, author, version, description, license] = await readDefaults(projectPath);
    expect(projectSpec.specVersion).toEqual(specVersion);
    expect(projectSpec.repository).toEqual(repository);
    expect(projectSpec.endpoint).toEqual(endpoint);
    expect(projectSpec.author).toEqual(author);
    expect(projectSpec.version).toEqual(version);
    expect(projectSpec.description).toEqual(description);
    expect(projectSpec.license).toEqual(license);
  });

  it('allow git from sub directory', async () => {
    const tempPath = await makeTempDir();

    const template: Template = {
      remote: 'https://github.com/subquery/subql-starter',
      family: 'Substrate',
      branch: 'main',
      network: 'Polkadot',
      name: 'Polkadot-starter',
      description: '',
    };

    const projectPath = await cloneProjectTemplate(tempPath, projectSpec.name, template);
    await prepare(projectPath, projectSpec);
    await expect(fileExists(path.join(tempPath, `${projectSpec.name}`))).resolves.toEqual(true);
  }, 5000000);
});
