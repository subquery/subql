// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as path from 'path';
import {NodeConfig} from '../configure/NodeConfig';
import {IndexerSandbox} from './sandbox';

describe('sandbox for subql-node', () => {
  let vm: IndexerSandbox;

  afterEach(() => {
    vm.removeAllListeners();
  });

  it('wait until promise resolved', async () => {
    const root = path.resolve(__dirname, '../../test/sandbox');
    const entry = './main.js';
    vm = new IndexerSandbox(
      {
        store: undefined,
        root,
        entry,
        chainId: '1',
        // script: fs.readFileSync(path.join(root, entry)).toString(),
      },
      new NodeConfig({subquery: ' ', subqueryName: ' '})
    );
    let sandboxFuncionEndAt: Date | undefined;
    vm.on('console.log', (line) => {
      if (line === 'OK') {
        sandboxFuncionEndAt = new Date();
      }
    });
    await vm.securedExec('testSandbox', []);
    const secureExecEndAt = new Date();
    expect(sandboxFuncionEndAt).toBeDefined();
    expect(secureExecEndAt.getTime()).toBeGreaterThanOrEqual(sandboxFuncionEndAt?.getTime() ?? 0);
  });
});
