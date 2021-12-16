// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { RegisteredTypes } from '@polkadot/types/types';
import { ProjectManifestVersioned } from '@subql/common';
import { SubqueryProject } from './project.model';

const chainTypes: RegisteredTypes = {
  types: {
    TestType: 'u32',
  },
  typesAlias: {
    Alias: { TestType2: 'test' },
  },
  typesBundle: {
    spec: {
      '2312': {
        types: [{ minmax: [232, 122], types: { TestType3: 'test3' } }],
      },
    },
    chain: {
      mockchain: {
        types: [{ minmax: [232, 122], types: { TestType4: 'test4' } }],
      },
    },
  },
  typesChain: { chain2: { TestType5: 'test' } },
  typesSpec: { spec3: { TestType6: 'test' } },
};

const manifestV0_0_1 = new ProjectManifestVersioned({
  specVersion: '0.0.1',
  network: {
    endpoint: '',
    ...chainTypes,
  },
} as any);

describe('SubqueryProject', () => {
  let project: SubqueryProject;

  describe('Manifest v0.0.1', () => {
    beforeEach(() => {
      project = new SubqueryProject(manifestV0_0_1, '');
    });

    it('can get the chain types', () => {
      expect(project.chainTypes).toMatchObject(chainTypes);
    });
  });

  describe('Manifest v0.2.0', () => {
    it('can get the chain types', async () => {
      const projectDir = path.resolve(
        __dirname,
        '../../test/projectFixture/v0.2.0/yaml',
      );
      project = await SubqueryProject.create(projectDir);

      expect(project.chainTypes).toMatchObject(chainTypes);
    });

    it('should throw if manifest endpoint or networkEndpoint is not provided', async () => {
      const projectDir = path.resolve(
        __dirname,
        '../../test/projectFixture/v0.2.0/yaml',
      );
      project = await SubqueryProject.create(projectDir);
      project.projectManifest.asV0_2_0.network.endpoint = undefined;
      expect(() => project.network).toThrow();
    });

    it('can fetch chain types from js file', async () => {
      const projectDir = path.resolve(
        __dirname,
        '../../test/projectFixture/v0.2.0/js/test1',
      );
      project = await SubqueryProject.create(projectDir);
      expect(project.chainTypes).toMatchObject(chainTypes);
    });

    it('It wont allow sandbox to use unpermitted modules', async () => {
      const projectDir = path.resolve(
        __dirname,
        '../../test/projectFixture/v0.2.0/js/test2',
      );
      project = await SubqueryProject.create(projectDir);
      expect(() => project.chainTypes).toThrow();
    });

    it('It will ignore non-default exports', async () => {
      const projectDir = path.resolve(
        __dirname,
        '../../test/projectFixture/v0.2.0/js/test3',
      );
      project = await SubqueryProject.create(projectDir);
      expect(() => project.chainTypes).toThrow(
        'failed to load chain types module. check module exports',
      );
    });

    it('It will throw error if containing property not in whitelist', async () => {
      const projectDir = path.resolve(
        __dirname,
        '../../test/projectFixture/v0.2.0/js/test4',
      );
      project = await SubqueryProject.create(projectDir);
      expect(() => project.chainTypes).toThrow();
    });
  });
});
