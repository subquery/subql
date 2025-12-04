// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync, writeFileSync, mkdirSync, rmSync} from 'fs';
import {tmpdir} from 'os';
import * as path from 'path';
import {join} from 'path';
import {NodeVM, VMScript} from 'vm2';
import {NodeConfig} from '../configure/NodeConfig';
import {IndexerSandbox, TestSandbox} from './sandbox';

describe('sandbox for subql-node', () => {
  let vm: IndexerSandbox;

  afterEach(() => {
    vm?.removeAllListeners();
  });

  // This was caused by vm2@3.10.0 changes that were breaking in a minor release.
  it('Can use older libraries that use prototypes to set properties', () => {
    const script = `
      const util = require('util');
      const EventEmitter = require('events');

      function MyStream() {
        console.log("This is sha1");
      }

      util.inherits(MyStream, EventEmitter);
    `;

    const vmScript = new VMScript(script);
    const vm = new NodeVM({
      console: 'inherit',
      require: {
        builtin: ['util', 'events'],
      },
    });
    expect(() => vm.run(vmScript)).not.toThrow();
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

describe('Sandbox Environment Variable Support', () => {
  let testDir: string;
  let srcDir: string;

  const mockNodeConfig: NodeConfig = {
    subquery: '/test/project',
    timeout: 30000,
    unsafe: false,
  } as NodeConfig;

  beforeEach(() => {
    testDir = join(tmpdir(), `subql-sandbox-test-${Date.now()}`);
    srcDir = join(testDir, 'src');
    mkdirSync(srcDir, {recursive: true});
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, {recursive: true, force: true});
    }
  });

  describe('IndexerSandbox with environment variables', () => {
    it('should inject environment variables into sandbox', () => {
      const envConfig = {
        DATABASE_URL: 'postgresql://localhost:5432/test',
        API_KEY: 'test-key-123',
        NODE_ENV: 'test',
      };

      const sandbox = new IndexerSandbox(
        {
          root: testDir,
          entry: 'src/mappings.js',
          chainId: 'test-chain',
          envConfig,
        },
        mockNodeConfig
      );

      // Check that environment variables were injected by examining the sandbox's globals
      const processGlobal = (sandbox as any).getGlobal('process');
      expect(processGlobal).toBeDefined();
      expect(processGlobal.env).toEqual({
        DATABASE_URL: 'postgresql://localhost:5432/test',
        API_KEY: 'test-key-123',
        NODE_ENV: 'test',
      });
    });

    it('should work without environment variables', () => {
      const sandbox = new IndexerSandbox(
        {
          root: testDir,
          entry: 'src/mappings.js',
          chainId: 'test-chain',
          // No envConfig provided
        },
        mockNodeConfig
      );

      // Check that process global exists (vm2 injects it by default) but our custom env is not injected
      const processGlobal = (sandbox as any).getGlobal('process');
      expect(processGlobal).toBeDefined();
      // The env should be the default Node.js process.env, not our custom variables
      expect(processGlobal.env.DATABASE_URL).toBeUndefined();
      expect(processGlobal.env.API_KEY).toBeUndefined();
    });

    it('should handle empty environment config', () => {
      const sandbox = new IndexerSandbox(
        {
          root: testDir,
          entry: 'src/mappings.js',
          chainId: 'test-chain',
          envConfig: {},
        },
        mockNodeConfig
      );

      // Check that process global was injected with empty env
      const processGlobal = (sandbox as any).getGlobal('process');
      expect(processGlobal).toBeDefined();
      expect(processGlobal.env).toEqual({});
    });
  });

  describe('TestSandbox with environment variables', () => {
    it('should inject environment variables into test sandbox', () => {
      const testContent = `
        const result = {
          databaseUrl: process.env.DATABASE_URL,
          apiKey: process.env.API_KEY,
          hasProcess: typeof process !== 'undefined'
        };

        global.subqlTests = [result];
      `;
      const testPath = join(srcDir, 'test.js');
      writeFileSync(testPath, testContent);

      const envConfig = {
        DATABASE_URL: 'postgresql://localhost:5432/test',
        API_KEY: 'test-key-456',
      };

      const sandbox = new TestSandbox(
        {
          root: testDir,
          entry: testPath,
          chainId: 'test-chain',
          envConfig,
        },
        mockNodeConfig
      );

      const tests = sandbox.getTests();

      expect(tests).toHaveLength(1);
      expect(tests[0]).toEqual({
        databaseUrl: 'postgresql://localhost:5432/test',
        apiKey: 'test-key-456',
        hasProcess: true,
      });
    });

    it('should work without environment variables in test sandbox', () => {
      const testContent = `
        const result = {
          hasProcess: typeof process !== 'undefined',
          processType: typeof process
        };

        global.subqlTests = [result];
      `;
      const testPath = join(srcDir, 'test.js');
      writeFileSync(testPath, testContent);

      const sandbox = new TestSandbox(
        {
          root: testDir,
          entry: testPath,
          chainId: 'test-chain',
          // No envConfig
        },
        mockNodeConfig
      );

      const tests = sandbox.getTests();

      expect(tests).toHaveLength(1);
      // Note: TestSandbox might still inject some globals, so we check that env is empty
      expect(tests[0]).toEqual({
        hasProcess: true,
        processType: 'object',
      });
    });
  });

  describe('Sandbox security with environment variables', () => {
    it('should inject custom environment variables correctly', () => {
      const sandbox = new IndexerSandbox(
        {
          root: testDir,
          entry: 'src/mappings.js',
          chainId: 'test-chain',
          envConfig: {SAFE_VAR: 'safe-value', ANOTHER_VAR: 'another-value'},
        },
        mockNodeConfig
      );

      // Check that custom environment variables are injected
      const processGlobal = (sandbox as any).getGlobal('process');
      expect(processGlobal).toBeDefined();
      expect(processGlobal.env.SAFE_VAR).toBe('safe-value');
      expect(processGlobal.env.ANOTHER_VAR).toBe('another-value');

      // Verify that our custom environment variables are present
      expect(Object.keys(processGlobal.env)).toContain('SAFE_VAR');
      expect(Object.keys(processGlobal.env)).toContain('ANOTHER_VAR');
    });

    it('should preserve original environment variables', () => {
      const originalEnv = {DATABASE_URL: 'postgresql://localhost:5432/original'};

      const sandbox = new IndexerSandbox(
        {
          root: testDir,
          entry: 'src/mappings.js',
          chainId: 'test-chain',
          envConfig: originalEnv,
        },
        mockNodeConfig
      );

      // Verify the original env config is intact
      const processGlobal = (sandbox as any).getGlobal('process');
      expect(processGlobal.env.DATABASE_URL).toBe('postgresql://localhost:5432/original');
    });
  });
});
