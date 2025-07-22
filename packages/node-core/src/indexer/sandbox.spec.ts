// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
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

  // Skip for now, inject Uint8Array into sandbox will break eth skd
  it.skip('buffer concat with Uint8Array within sandbox', async () => {
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

  it('inject atob into sandbox', async () => {
    // src code in the function, this should be resolved
    const base64String = 'SGVsbG8sIFdvcmxkIQ==';
    expect(atob(base64String)).toBe('Hello, World!');

    const root = path.resolve(__dirname, '../../test/sandbox');
    const entry = './atob-test.js';
    vm = new IndexerSandbox(
      {
        store: undefined,
        root,
        entry,
        chainId: '1',
      },
      new NodeConfig({subquery: ' ', subqueryName: ' '})
    );
    let sandboxFuncionEndAt: Date | undefined;

    vm.on('console.log', (line) => {
      if (line === 'Hello, World!') {
        sandboxFuncionEndAt = new Date();
      }
    });
    await vm.securedExec('testSandbox', []);
    const secureExecEndAt = new Date();
    expect(sandboxFuncionEndAt).toBeDefined();
    expect(secureExecEndAt.getTime()).toBeGreaterThanOrEqual(sandboxFuncionEndAt?.getTime() ?? 0);
  });

  it.each([
    ['./sourcemap-test-esbuild.js', 'packages/node-core/test/src/mappings/mappingHandlers.ts:6:19'],
    ['./sourcemap-test-webpack.js', '/dymension/src/mappings/mappingHandlers.ts:8:11'],
  ])('can decode sourcemap %s', async (entry, mapped) => {
    const root = path.resolve(__dirname, '../../test/sandbox');
    vm = new IndexerSandbox(
      {
        store: undefined,
        root,
        entry,
        chainId: '1',
      },
      new NodeConfig({subquery: ' ', subqueryName: ' '})
    );

    const error = await vm.securedExec('throwError', []).then(
      () => new Error('Expected error to be thrown'),
      (e) => e
    );

    expect(error.message).toBe('this is a test error');
    expect(error.stack).toContain(mapped);
  });
});
