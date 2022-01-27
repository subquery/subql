// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import { NodeConfig } from '../configure/NodeConfig';
import { IndexerSandbox } from './sandbox.service';

describe('sandbox for subql-node', () => {
  let vm: IndexerSandbox;

  afterEach(() => {
    vm.removeAllListeners();
  });

  it('wait until promise resolved', async () => {
    vm = new IndexerSandbox(
      {
        store: undefined,
        root: path.resolve(__dirname, '../../test/sandbox'),
        entry: './main.js',
      },
      new NodeConfig({ subquery: '', subqueryName: '' }),
    );
    let sandboxFuncionEndAt: Date;
    vm.on('console.log', (line) => {
      if (line === 'OK') {
        sandboxFuncionEndAt = new Date();
      }
    });
    await vm.securedExec('testSandbox', []);
    const secureExecEndAt = new Date();
    expect(sandboxFuncionEndAt).toBeTruthy();
    expect(secureExecEndAt.getTime()).toBeGreaterThanOrEqual(
      sandboxFuncionEndAt.getTime(),
    );
  });
});
