// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {promisify} from 'util';
import {mapToObject, NETWORK_FAMILY, ReaderFactory, toJsonObject} from '@subql/common';
import rimraf from 'rimraf';
import {createTestProject} from '../createProject.fixtures';
import {loadDependency} from '../modulars';
import {uploadToIpfs} from './publish-controller';

// Replace/Update your access token when test locally
const testAuth = process.env.SUBQL_ACCESS_TOKEN;

jest.setTimeout(300_000); // 300s
describe('Cli publish', () => {
  let projectDir: string;

  beforeAll(async () => {
    projectDir = await createTestProject();
  });

  afterAll(async () => {
    try {
      if (!projectDir) return;
      await promisify(rimraf)(projectDir);
    } catch (e) {
      console.warn('Failed to clean up tmp dir after test', e);
    }
  });

  it('should upload appropriate project to IPFS', async () => {
    const cid = await uploadToIpfs([projectDir], testAuth);
    expect(cid).toBeDefined();
  });

  it('convert to deployment and removed descriptive field', async () => {
    const reader = await ReaderFactory.create(projectDir);
    const substrateModule = loadDependency(NETWORK_FAMILY.substrate);
    const manifest = substrateModule.parseSubstrateProjectManifest(await reader.getProjectSchema());
    const deployment = manifest.toDeployment();
    expect(deployment).not.toContain('author');
    expect(deployment).not.toContain('endpoint');
    expect(deployment).not.toContain('dictionary');
    expect(deployment).not.toContain('description');
    expect(deployment).not.toContain('repository');

    expect(deployment).toContain('chainId');
    expect(deployment).toContain('specVersion');
    expect(deployment).toContain('dataSources');
  });

  it('convert js object to JSON object', () => {
    const mockMap = new Map<number | string, string>([
      [1, 'aaa'],
      ['2', 'bbb'],
    ]);
    expect(toJsonObject({map: mockMap, obj: {abc: 111}})).toStrictEqual({
      map: {'1': 'aaa', '2': 'bbb'},
      obj: {abc: 111},
    });
    expect(mapToObject(mockMap)).toStrictEqual({'1': 'aaa', '2': 'bbb'});
  });
});
