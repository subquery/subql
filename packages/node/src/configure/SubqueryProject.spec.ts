// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';

import {
  GithubReader,
  IPFSReader,
  IPFS_NODE_ENDPOINT,
  LocalReader,
  makeTempDir,
  ReaderFactory,
} from '@subql/common';
import {
  SubstrateCustomDataSourceImpl,
  isCustomDs,
} from '@subql/common-substrate';
import { updateDataSourcesV1_0_0 } from '@subql/node-core';
import {
  SubstrateCustomDatasource,
  SubstrateRuntimeDatasource,
} from '@subql/types';
import { Reader } from '@subql/types-core';
import { createSubQueryProject } from './SubqueryProject';

// eslint-disable-next-line jest/no-export
export async function getProjectRoot(reader: Reader): Promise<string> {
  if (reader instanceof LocalReader) return reader.root;
  if (reader instanceof IPFSReader || reader instanceof GithubReader) {
    return makeTempDir();
  }
  throw new Error('Un-known reader type');
}

// Inspect asset path and content
function inspectAsset(inspectAssetPath: string) {
  const { dir, ext } = path.parse(inspectAssetPath);
  // should have no extension
  expect(ext).toBe('');
  const assetContent = fs.readFileSync(inspectAssetPath, 'utf8');
  // And when we load it, it should resolve correct abi
  expect(assetContent).toContain('transferFrom');
}

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
      const project = await createSubQueryProject(
        projectDirV1_0_0,
        rawManifest,
        reader,
        await getProjectRoot(reader),
        {
          endpoint: ['wss://rpc.polkadot.io/public-ws'],
        },
      );

      expect(project.runner).toMatchObject(expectedRunner);
    }, 500000);

    it('check processChainId', async () => {
      const reader = await ReaderFactory.create(projectDirV1_0_0);
      const rawManifest = await reader.getProjectSchema();
      const project = await createSubQueryProject(
        projectDirV1_0_0,
        rawManifest,
        reader,
        await getProjectRoot(reader),
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
      const project = await createSubQueryProject(
        templateProject,
        templateRawManifest,
        reader0,
        await getProjectRoot(reader0),
        {
          endpoint: ['wss://moonbeam-alpha.api.onfinality.io/public-ws'],
        },
      );
      const reader1 = await ReaderFactory.create(projectDirV1_0_0);
      const rawManifest = await reader1.getProjectSchema();
      const project_v1 = await createSubQueryProject(
        projectDirV1_0_0,
        rawManifest,
        reader1,
        await getProjectRoot(reader1),
        {
          endpoint: ['wss://rpc.polkadot.io/public-ws'],
        },
      );
      expect(project_v1).not.toContain('template');
      expect(project.templates.length).toBe(1);
    });
  });

  it('loads chainTypes from deployment', async () => {
    const reader = await ReaderFactory.create(
      'ipfs://QmZYR6tpRYvmnKoUtugpwYfH9CpP7a8fYYcLVX3d7dph2j',
      { ipfs: IPFS_NODE_ENDPOINT },
    );

    const project = await createSubQueryProject(
      'ipfs://QmZYR6tpRYvmnKoUtugpwYfH9CpP7a8fYYcLVX3d7dph2j',
      await reader.getProjectSchema(),
      reader,
      await getProjectRoot(reader),
      {
        endpoint: ['wss://astar.api.onfinality.io/public-ws'],
      },
    );

    expect(project.chainTypes).toBeDefined();
  }, 50000);

  it('loads asset file correctly from deployment', async () => {
    const reader = await ReaderFactory.create(
      'ipfs://QmRoosV27325uAeepKqaTEPFKjC3nk4rrKmZJSd7QXYKZQ',
      { ipfs: IPFS_NODE_ENDPOINT },
    );

    const project = await createSubQueryProject(
      'ipfs://QmRoosV27325uAeepKqaTEPFKjC3nk4rrKmZJSd7QXYKZQ',
      await reader.getProjectSchema(),
      reader,
      await getProjectRoot(reader),
      {
        endpoint: ['wss://moonriver.api.onfinality.io/public-ws'],
      },
    );
    expect(project.templates[0].name).toBeDefined();
    // Expect asset to be fetched
    const inspectAssetPath = (project.templates[0] as any).assets.get(
      'erc20',
    ).file;
    inspectAsset(inspectAssetPath);
  }, 50000);
});

describe('load asset with updateDataSourcesV1_0_0', () => {
  const customDsImpl: SubstrateCustomDataSourceImpl[] = [
    {
      kind: 'substrate/FrontierEvm',
      assets: new Map([
        [
          'erc20',
          {
            file: 'ipfs://QmYoHL3BvEW6nH1zYZqnziUHjajadu5ErJHavHS2zXkZhv',
          },
        ],
      ]),
      mapping: {
        file: 'ipfs://QmP4Hrfydh4zswkZYeTnnZQFhTGo3LkCfHz4jdkbP8ZA8P',
        handlers: [
          {
            filter: {
              topics: [
                'Transfer(address indexed from,address indexed to,uint256 value)',
              ],
            },
            handler: 'handleEvmEvent',
            kind: 'substrate/FrontierEvmEvent',
          },
          {
            filter: {
              function: 'approve(address to,uint256 value)',
            },
            handler: 'handleEvmCall',
            kind: 'substrate/FrontierEvmCall',
          },
        ],
      },
      processor: {
        file: 'ipfs://QmeHHtqRFSJQwv8pr6oUDsAkNPNAPSXXPoKiab8NKJHkiH',
        options: {
          abi: 'erc20',
          address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b',
        },
      },
      startBlock: 752073,
      validate: jest.fn(),
    },
  ];
  let root: string;
  let reader: Reader;
  beforeEach(async () => {
    reader = await ReaderFactory.create(
      'ipfs://QmRoosV27325uAeepKqaTEPFKjC3nk4rrKmZJSd7QXYKZQ',
      { ipfs: IPFS_NODE_ENDPOINT },
    );
    root = await makeTempDir();
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('After fix, it could load asset correctly', async () => {
    const ds = await updateDataSourcesV1_0_0<
      SubstrateRuntimeDatasource,
      SubstrateCustomDatasource<any, any>
    >(customDsImpl, reader, root, isCustomDs);
    const inspectAssetPath = (ds[0] as any).assets.get('erc20').file;
    inspectAsset(inspectAssetPath);
  }, 50000);
});
