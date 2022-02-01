// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { NodeConfig } from './NodeConfig';

describe('NodeConfig', () => {
  it('supports read from yaml', () => {
    const config = NodeConfig.fromFile(
      path.join(__dirname, '../../test/config.yml'),
    );
    expect(config).toBeInstanceOf(NodeConfig);
    expect(config).toMatchObject({
      subquery: '../../../../subql-example/extrinsics',
      subqueryName: 'extrinsics',
    });
    expect(config.configDir).toBeTruthy();
  });

  it('support read from json', () => {
    const config = NodeConfig.fromFile(
      path.join(__dirname, '../../test/config.json'),
    );
    expect(config).toBeInstanceOf(NodeConfig);
    expect(config).toMatchObject({
      subquery: '../../../../subql-example/extrinsics',
      subqueryName: 'extrinsics',
    });
    expect(config.configDir).toBeTruthy();
  });

  it('throw error for unknown configs', () => {
    expect(() =>
      NodeConfig.fromFile(path.join(__dirname, '../../test/config.toml')),
    ).toThrow();
    expect(() =>
      NodeConfig.fromFile(path.join(__dirname, '../../test/con.toml')),
    ).toThrow(/Load config from file/);
  });
});
