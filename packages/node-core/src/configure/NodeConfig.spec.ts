// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as path from 'path';
import {NodeConfig, IConfig} from './NodeConfig';

describe('NodeConfig', () => {
  it('supports read from yaml', () => {
    const config = NodeConfig.fromFile(path.join(__dirname, '../../test/config.yml'));
    expect(config).toBeInstanceOf(NodeConfig);
    expect(config).toMatchObject({
      subquery: '../../../../subql-example/extrinsics',
      subqueryName: 'extrinsics',
    });
  });

  it('support read from json', () => {
    const config = NodeConfig.fromFile(path.join(__dirname, '../../test/config.json'));
    expect(config).toBeInstanceOf(NodeConfig);
    expect(config).toMatchObject({
      subquery: '../../../../subql-example/extrinsics',
      subqueryName: 'extrinsics',
    });
  });

  it('rebase file config from manifest runner options', () => {
    const configPath = path.join(__dirname, '../../test/config.json');
    const fileConfig = NodeConfig.fromFile(configPath);

    const mockArgIConfig = {
      workers: 4,
      unsafe: true,
      disableHistorical: false,
      unfinalizedBlocks: false,
    } as Partial<IConfig>;
    const config = NodeConfig.rebaseWithArgs(fileConfig, mockArgIConfig);
    // Fill undefined
    expect(config.workers).toBe(4);
    // override default config from manifest options
    expect(config.unsafe).toBeTruthy();
  });

  it('throw error for unknown configs', () => {
    expect(() => NodeConfig.fromFile(path.join(__dirname, '../../test/config.toml'))).toThrow();
    expect(() => NodeConfig.fromFile(path.join(__dirname, '../../test/con.toml'))).toThrow(/Load config from file/);
  });
});
