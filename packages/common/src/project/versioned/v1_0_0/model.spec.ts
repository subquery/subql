// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IProjectNetworkConfig} from '@subql/types-core';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
import {CommonProjectNetworkV1_0_0, CommonRunnerSpecsImpl} from './models';

describe('Validating base v1_0_0 model', () => {
  it('correctly validates the various endpoint structures in a network config', () => {
    const config1: IProjectNetworkConfig = {
      chainId: '1',
      endpoint: 'https://example.com',
    };

    const config2: IProjectNetworkConfig = {
      chainId: '1',
      endpoint: ['https://example.com', 'https://foo.bar'],
    };

    const config3: IProjectNetworkConfig = {
      chainId: '1',
      endpoint: {
        'https://example.com': {
          headers: {'api-key': '1234'},
        },
      },
    };

    const bad1 = {
      chainId: '1',
      endpoint: 1,
    };

    const bad2 = {
      chainId: '1',
      endpoint: [1],
    };

    const bad3 = {
      chainId: '1',
      endpoint: [
        {
          2: {},
        },
      ],
    };

    const bad4 = {
      chainId: '1',
      endpoint: [
        {
          'https://example.com': undefined,
        },
      ],
    };

    function validate(raw: unknown) {
      const projectManifest = plainToClass<CommonProjectNetworkV1_0_0, unknown>(CommonProjectNetworkV1_0_0, raw);
      const errors = validateSync(projectManifest, {whitelist: true});

      if (errors.length) {
        throw new Error(errors.map((e) => e.value).join('\n'));
      }
    }

    expect(() => validate(config1)).not.toThrow();
    expect(() => validate(config2)).not.toThrow();
    expect(() => validate(config3)).not.toThrow();
    expect(() => validate(bad1)).toThrow();
    expect(() => validate(bad2)).toThrow();
    expect(() => validate(bad3)).toThrow();
    expect(() => validate(bad4)).toThrow();
  });

  it('validates manifest Runner', () => {
    function validate(raw: unknown) {
      const projectManifest = plainToClass<CommonRunnerSpecsImpl, unknown>(CommonRunnerSpecsImpl, raw);
      const errors = validateSync(projectManifest, {whitelist: true});

      if (errors.length) {
        throw new Error(errors.map((e) => e.value).join('\n'));
      }
    }

    const normalRunner: unknown = {
      node: {
        name: '@subql/node',
        version: '>=3.0.1',
      },
      query: {
        name: '@subql/query',
        version: '*',
      },
    };

    const notExistQueryRunner: unknown = {
      node: {
        name: '@subql/node',
        version: '>=3.0.1',
      },
      query: {
        name: '@subql/not-exist',
        version: '*',
      },
    };
    const subgraphQueryRunner: unknown = {
      node: {
        name: '@subql/node',
        version: '>=3.0.1',
      },
      query: {
        name: '@subql/query-subgraph',
        version: '*',
      },
    };

    expect(() => validate(normalRunner)).not.toThrow();
    expect(() => validate(notExistQueryRunner)).toThrow();
    expect(() => validate(subgraphQueryRunner)).not.toThrow();
  });
});
