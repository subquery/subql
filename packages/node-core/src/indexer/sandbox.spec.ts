// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
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

  it('buffer concat with Uint8Array within sandbox', async () => {
    // src code in the function, this should be resolved
    const str = 'Hello, Buffer!';
    const strBuffer = Buffer.from(str);
    const uin8Array = new Uint8Array(2);
    uin8Array[0] = 72; //'H'
    uin8Array[1] = 101; //'e'
    expect(Buffer.concat([strBuffer, uin8Array])).toBeTruthy();

    const root = path.resolve(__dirname, '../../test/sandbox');
    const entry = './buffer-test.js';
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
    let sandboxFuncionEndAt1: Date | undefined;
    let sandboxFuncionEndAt2: Date | undefined;

    vm.on('console.log', (line) => {
      if (line === 'Hello, Buffer!He') {
        sandboxFuncionEndAt1 = new Date();
      }
      if (line === 'HeHe') {
        sandboxFuncionEndAt2 = new Date();
      }
    });
    await vm.securedExec('testSandbox', []);
    await vm.securedExec('testUin8Array', []);

    const secureExecEndAt = new Date();
    expect(sandboxFuncionEndAt1).toBeDefined();
    expect(secureExecEndAt.getTime()).toBeGreaterThanOrEqual(sandboxFuncionEndAt1?.getTime() ?? 0);
    expect(sandboxFuncionEndAt2).toBeDefined();
  });
});
