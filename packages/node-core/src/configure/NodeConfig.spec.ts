// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
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

  it('Monitor configs default value', () => {
    const fileConfig = NodeConfig.fromFile(path.join(__dirname, '../../test/config.yml'));
    expect(fileConfig.monitorFileSize).toEqual(0);
    expect(fileConfig.monitorObjectMaxDepth).toEqual(0);

    const config2 = NodeConfig.rebaseWithArgs(fileConfig, {
      monitorObjectMaxDepth: 10,
    });
    expect(config2.monitorObjectMaxDepth).toEqual(10);

    const config3 = NodeConfig.rebaseWithArgs(fileConfig, {
      proofOfIndex: true,
    });
    expect(config3.monitorFileSize).toEqual(200);
  });
});
