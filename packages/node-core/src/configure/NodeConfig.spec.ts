// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
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
    expect(fileConfig.monitorObjectMaxDepth).toEqual(5);

    const config2 = NodeConfig.rebaseWithArgs(fileConfig, {
      monitorObjectMaxDepth: 10,
    });
    expect(config2.monitorObjectMaxDepth).toEqual(10);

    const config3 = NodeConfig.rebaseWithArgs(fileConfig, {
      proofOfIndex: true,
    });
    expect(config3.monitorFileSize).toEqual(200);
  });

  it('Has the correct default behaviour for unfinalizedBlocks', () => {
    const config = new NodeConfig({historical: false} as any);
    expect(config.unfinalizedBlocks).toBe(false);

    const config1 = new NodeConfig({historical: 'height'} as any);
    expect(config1.unfinalizedBlocks).toBe(true);

    const config2 = new NodeConfig({historical: 'timestamp'} as any);
    expect(config2.unfinalizedBlocks).toBe(true);

    const config3 = new NodeConfig({historical: 'timestamp', unfinalizedBlocks: false} as any);
    expect(config3.unfinalizedBlocks).toBe(false);

    const config4 = new NodeConfig({historical: false, unfinalizedBlocks: true} as any);
    expect(config4.unfinalizedBlocks).toBe(false);

    const config5 = new NodeConfig({historical: 'height', unfinalizedBlocks: true} as any, true);
    expect(config5.unfinalizedBlocks).toBe(false);
  });
});
