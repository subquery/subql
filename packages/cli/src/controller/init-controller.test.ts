// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import path from 'path';
import {makeTempDir} from '@subql/common';
import {
  cloneProjectGit,
  cloneProjectTemplate,
  fetchTemplates,
  prepare,
  readDefaults,
  Template,
} from './init-controller';

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
