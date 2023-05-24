// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';

import { IPFS_NODE_ENDPOINT, ReaderFactory } from '@subql/common';
import { SubqueryProject } from './SubqueryProject';

describe('SubqueryProject', () => {
  describe('convert manifest to project object', () => {
    let projectDirV1_0_0: string;
    let templateProject: string;

    beforeEach(() => {
      projectDirV1_0_0 = path.resolve(
        __dirname,
        '../../test/projectFixture/v1.0.0',
      );
      templateProject = path.resolve(
        __dirname,
        '../../test/projectFixture/template-v1.0.0',
      );
    });

    it('convert 1.0.0 ipfs deployment to project object', async () => {
      const reader = await ReaderFactory.create(projectDirV1_0_0);
      const expectedRunner = {
        node: {
          name: '@subql/node',
          version: '>=1.0.0',
        },
        query: {
          name: '@subql/query',
          version: '*',
        },
      };
      const rawManifest = await reader.getProjectSchema();
      const project = await SubqueryProject.create(
        projectDirV1_0_0,
        rawManifest,
        reader,
        {
          endpoint: ['wss://rpc.polkadot.io/public-ws'],
        },
      );

      expect(project.runner).toMatchObject(expectedRunner);
    }, 500000);

    it('check processChainId', async () => {
      const reader = await ReaderFactory.create(projectDirV1_0_0);
      const rawManifest = await reader.getProjectSchema();
      const project = await SubqueryProject.create(
        projectDirV1_0_0,
        rawManifest,
        reader,
        {
          endpoint: ['wss://rpc.polkadot.io/public-ws'],
        },
      );
      expect(project.network.chainId).toMatch(
        '0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b',
      );
    }, 5000000);

    it('check loadProjectTemplates', async () => {
      const reader0 = await ReaderFactory.create(templateProject);
      const templateRawManifest = await reader0.getProjectSchema();
      const project = await SubqueryProject.create(
        templateProject,
        templateRawManifest,
        reader0,
        {
          endpoint: ['wss://moonbeam-alpha.api.onfinality.io/public-ws'],
        },
      );
      const reader1 = await ReaderFactory.create(projectDirV1_0_0);
      const rawManifest = await reader1.getProjectSchema();
      const project_v1 = await SubqueryProject.create(
        projectDirV1_0_0,
        rawManifest,
        reader1,
        {
          endpoint: ['wss://rpc.polkadot.io/public-ws'],
        },
      );
      expect(project_v1).not.toContain('template');
      expect(project.templates.length).toBe(1);
    });
  });

  it('loads chainTypes from deplyoment', async () => {
    const reader = await ReaderFactory.create(
      'ipfs://QmZYR6tpRYvmnKoUtugpwYfH9CpP7a8fYYcLVX3d7dph2j',
      { ipfs: IPFS_NODE_ENDPOINT },
    );

    const project = await SubqueryProject.create(
      'ipfs://QmZYR6tpRYvmnKoUtugpwYfH9CpP7a8fYYcLVX3d7dph2j',
      await reader.getProjectSchema(),
      reader,
      {
        endpoint: ['wss://astar.api.onfinality.io/public-ws'],
      },
    );

    expect(project.chainTypes).toBeDefined();
  });
});
