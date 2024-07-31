// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync, readFileSync} from 'fs';
import path from 'path';
import {SubqlTest} from '@subql/testing';
import {Cache, Store} from '@subql/types-core';
import {levelFilter} from '@subql/utils';
import {last, merge} from 'lodash';
import {SourceMapConsumer, NullableMappedPosition} from 'source-map';
import {NodeVM, NodeVMOptions, VMError, VMScript} from 'vm2';
import {NodeConfig} from '../configure/NodeConfig';
import {getLogger} from '../logger';
import {timeout} from '../utils';

export const SANDBOX_DEFAULT_BUILTINS = ['assert', 'buffer', 'crypto', 'util', 'path', 'url', 'stream'];

export interface SandboxOption {
  cache?: Cache;
  store?: Store;
  root: string;
  entry: string;
  chainId: string;
}

const DEFAULT_OPTION = (unsafe = false): NodeVMOptions => {
  return {
    console: 'redirect',
    wasm: unsafe,
    sandbox: {atob},
    require: {
      builtin: unsafe ? ['*'] : SANDBOX_DEFAULT_BUILTINS,
      external: true,
      context: 'sandbox',
    },
    wrapper: 'commonjs',
    sourceExtensions: ['js', 'cjs'],
  };
};

const logger = getLogger('sandbox');

export class Sandbox extends NodeVM {
  private root: string;
  private entry: string;
  private sourceMap: any | undefined;

  constructor(
    option: SandboxOption,
    protected readonly script: VMScript,
    protected config: NodeConfig
  ) {
    super(
      merge(DEFAULT_OPTION(config.unsafe), {
        require: {
          root: option.root,
          resolve: (moduleName: string) => {
            return require.resolve(moduleName, {paths: [option.root]});
          },
        },
      })
    );

    // polkadot api uses URL global
    this.setGlobal('URL', require('url').URL);
    this.root = config.subquery.startsWith('ipfs://') ? '' : option.root;
    this.entry = option.entry;

    this.freeze(option.chainId, 'chainId');

    const sourceMapFile = path.join(this.root, this.entry);

    if (existsSync(sourceMapFile)) {
      this.sourceMap = this.decodeSourceMap(sourceMapFile);
    }
  }

  async runTimeout<T = unknown>(duration: number): Promise<T> {
    try {
      return await timeout(
        this.run(this.script),
        duration,
        `Sandbox execution timeout in ${duration} seconds. Please increase --timeout`
      );
    } catch (e) {
      const msgPart = 'Cannot find module ';
      if (e instanceof VMError && e.message.includes(msgPart)) {
        throw new Error(
          `Unable to resolve module ${e.message.replace(msgPart, '')}. To resolve this you can either:\n\tNarrow your import. e.g Instead of "import { BigNumber } from 'ethers'" you can use "import {BigNumber} from '@ethersproject/bignumber';"\n\tEnable the --unsafe flag.`,
          {cause: e}
        );
      }
      throw e;
    }
  }

  protected async convertStack(stackTrace: string | undefined): Promise<string | undefined> {
    if (!stackTrace) return undefined;
    if (!this.sourceMap) {
      logger.warn('Unable to find a source map. Rebuild your project with latest @subql/cli to generate a source map.');
      logger.warn('Logging unresolved stack trace.');
      return stackTrace;
    }

    const entryFile = last(this.entry.split('/')) ?? '';
    const entryParts = entryFile.split('.');
    const regex = new RegExp(`${entryParts[0]}.${entryParts[1]}:([0-9]+):([0-9]+)`, 'gi');
    const matches = [...stackTrace.matchAll(regex)];

    for (const match of matches) {
      const lineNumber = Number.parseInt(match[1]);
      const columnNumber = Number.parseInt(match[2]);
      const lineInfo = await this.findLineInfo(this.sourceMap, lineNumber, columnNumber);
      const newLineTrace = `${lineInfo.source}:${lineInfo.line}:${lineInfo.column}`;
      stackTrace = stackTrace.replace(`${path.join(this.root, this.entry)}:${match[1]}:${match[2]}`, newLineTrace);
    }

    return stackTrace;
  }

  decodeSourceMap(sourceMapPath: string): any {
    const source = readFileSync(sourceMapPath).toString();
    const sourceMapBase64 = source.split(`//# sourceMappingURL=data:application/json;charset=utf-8;base64,`)[1];
    if (!sourceMapBase64) {
      logger.warn('Unable to find a source map for project');
      logger.warn('Build your project with latest @subql/cli to generate a source map');
      return;
    }
    const sourceMap = Buffer.from(sourceMapBase64, 'base64').toString();
    const json = JSON.parse(sourceMap);

    return json;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findLineInfo(
    sourcemap: any,
    compiledLineNumber: number,
    compiledColumnNumber: number
  ): Promise<NullableMappedPosition> {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const consumer = await new SourceMapConsumer(sourcemap);
    const lineInfo = consumer.originalPositionFor({line: compiledLineNumber, column: compiledColumnNumber});

    return lineInfo;
  }
}

export class IndexerSandbox extends Sandbox {
  constructor(option: SandboxOption, config: NodeConfig) {
    super(
      option,
      new VMScript(
        `const mappingFunctions = require('${option.entry}');
        if(mappingFunctions[funcName] === undefined){
          throw new Error('Handler function '+ funcName + ' is not found, available functions:' + JSON.stringify(Object.keys(mappingFunctions)))
        }
      module.exports = mappingFunctions[funcName](...args);
    `,
        path.join(option.root, 'sandbox')
      ),
      config
    );
    this.injectGlobals(option);
  }

  async securedExec(funcName: string, args: unknown[]): Promise<void> {
    this.setGlobal('args', args);
    this.setGlobal('funcName', funcName);
    try {
      await this.runTimeout(this.config.timeout);
    } catch (e: any) {
      const newStack = await this.convertStack(e.stack);
      e.stack = newStack;
      e.handler = funcName;
      if (this.config.logLevel && levelFilter('debug', this.config.logLevel)) {
        e.handlerArgs = JSON.stringify(args);
      }
      throw e;
    } finally {
      this.setGlobal('args', []);
      this.setGlobal('funcName', '');
    }
  }

  private injectGlobals({cache, store}: SandboxOption) {
    if (store) {
      this.freeze(store, 'store');
    }
    if (cache) {
      this.freeze(cache, 'cache');
    }
    this.freeze(logger, 'logger');
  }
}

export class TestSandbox extends Sandbox {
  constructor(option: SandboxOption, config: NodeConfig) {
    super(
      {
        ...option,
      },
      new VMScript(`const tests = require('${option.entry}');`, path.join(option.root, 'sandbox')),
      config
    );
    this.injectGlobals(option);
  }

  private injectGlobals({store}: SandboxOption) {
    if (store) {
      this.freeze(store, 'store');
    }
    this.freeze(logger, 'logger');
  }

  getTests(): SubqlTest[] {
    this.run(this.script);
    return this.getGlobal('subqlTests');
  }
}
