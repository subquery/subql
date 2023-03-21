// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {existsSync, readFileSync} from 'fs';
import path from 'path';
import {Store} from '@subql/types';
import {levelFilter} from '@subql/utils';
import {merge} from 'lodash';
import {SourceMapConsumer, NullableMappedPosition} from 'source-map';
import {decode} from 'vlq';
import {NodeVM, NodeVMOptions, VMScript} from 'vm2';
import {NodeConfig} from '../configure/NodeConfig';
import {getLogger} from '../logger';
import {timeout} from '../utils';

export interface SandboxOption {
  store?: Store;
  script: string;
  root: string;
  entry: string;
}

const DEFAULT_OPTION = (unsafe = false): NodeVMOptions => {
  return {
    console: 'redirect',
    wasm: unsafe,
    sandbox: {},
    require: {
      builtin: unsafe ? ['*'] : ['assert', 'buffer', 'crypto', 'util', 'path'],
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
  private sourceMap: any | undefined;

  constructor(option: SandboxOption, protected readonly script: VMScript, protected config: NodeConfig) {
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
    this.root = option.root;

    const filename = 'dist/index.js';
    const sourceMapPath = path.join(this.root, filename);

    if (existsSync(sourceMapPath)) {
      this.sourceMap = this.decodeSourceMap(sourceMapPath);
    }
  }

  async runTimeout<T = unknown>(duration: number): Promise<T> {
    return timeout(this.run(this.script), duration);
  }

  async convertStack(stackTrace: any) {
    if (!this.sourceMap) {
      return stackTrace;
    }
    const regex = /index\.js:([0-9]+):([0-9]+)/gi;
    const matches = [...stackTrace.matchAll(regex)];

    for (const match of matches) {
      const lineNumber = Number.parseInt(match[1]);
      const columnNumber = Number.parseInt(match[2]);
      const lineInfo = await this.findLineInfo(this.sourceMap, lineNumber, columnNumber);
      const newLineTrace = `${lineInfo.source}:${lineInfo.line}:${lineInfo.column}`;
      const filepath = path.join(this.root, 'dist/index.js');
      stackTrace = stackTrace.replace(`${filepath}:${match[1]}:${match[2]}`, newLineTrace);
    }

    return stackTrace;
  }

  decodeSourceMap(sourceMapPath: string) {
    const source = readFileSync(sourceMapPath).toString();
    const sourceMapBase64 = source.split(`//# sourceMappingURL=data:application/json;charset=utf-8;base64,`)[1];
    const sourceMap = Buffer.from(sourceMapBase64, 'base64').toString();
    const json = JSON.parse(sourceMap);

    return json;
  }

  async findLineInfo(
    sourcemap: any,
    compiledLineNumber: number,
    compiledColumnNumber: number
  ): Promise<NullableMappedPosition> {
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
    } catch (e) {
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

  private injectGlobals({store}: SandboxOption) {
    if (store) {
      this.freeze(store, 'store');
    }
    this.freeze(logger, 'logger');
  }
}
