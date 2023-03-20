// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {existsSync, readFileSync} from 'fs';
import path from 'path';
import {Store} from '@subql/types';
import {levelFilter} from '@subql/utils';
import {merge} from 'lodash';
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
  private sourceMap:
    | {
        decoded: number[][][];
        json: any;
      }
    | undefined;

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
    const sourceMapPath = path.join(this.root, `${filename}.map`);

    if (existsSync(sourceMapPath)) {
      this.sourceMap = this.decodeSourceMap(sourceMapPath);
    }
  }

  async runTimeout<T = unknown>(duration: number): Promise<T> {
    return timeout(this.run(this.script), duration);
  }

  convertStack(stackTrace: any) {
    if (!this.sourceMap) {
      return stackTrace;
    }
    const regex = /index\.js:([0-9]+):([0-9]+)/gi;
    const matches = [...stackTrace.matchAll(regex)];

    for (const match of matches) {
      const lineNumber = Number.parseInt(match[1]) - 1;
      if (lineNumber >= this.sourceMap.decoded.length) {
        continue;
      }
      const lineInfo = this.findLineInfo(this.sourceMap, lineNumber);
      const newLineTrace = `${lineInfo[0]}:${lineInfo[1]}:${match[2]}`;
      const filepath = path.join(this.root, 'dist/index.js');
      stackTrace = stackTrace.replace(`${filepath}:${match[1]}:${match[2]}`, newLineTrace);
    }

    return stackTrace;
  }

  decodeSourceMap(sourceMapPath: string) {
    const jsonStr = readFileSync(sourceMapPath).toString();
    const json = JSON.parse(jsonStr);

    const mappings: string = json.mappings;
    const vlqs = mappings.split(';').map((line) => line.split(','));
    let decoded = vlqs.map((line) => line.map(decode));

    let sourceFileIndex = 0; // second field
    let sourceCodeLine = 0; // third field
    let sourceCodeColumn = 0; // fourth field
    let nameIndex = 0; // fifth field

    decoded = decoded.map((line) => {
      let generatedCodeColumn = 0; // first field - reset each time

      return line.map((segment) => {
        if (segment.length === 0) {
          return [];
        }
        generatedCodeColumn += segment[0];

        const result = [generatedCodeColumn];

        if (segment.length === 1) {
          // only one field!
          return result;
        }

        sourceFileIndex += segment[1];
        sourceCodeLine += segment[2];
        sourceCodeColumn += segment[3];

        result.push(sourceFileIndex, sourceCodeLine, sourceCodeColumn);

        if (segment.length === 5) {
          nameIndex += segment[4];
          result.push(nameIndex);
        }

        return result;
      });
    });

    return {decoded, json};
  }

  findLineInfo(sourcemap: {json: any; decoded: any}, compiledLineNumber: number) {
    const json = sourcemap.json;
    const decoded = sourcemap.decoded;
    const lineMapping = decoded[compiledLineNumber][0];

    const sourceFile = json.sources[lineMapping[1]];
    const lineNumber = Number.parseInt(lineMapping[2]) + 1;
    const columnNumber = Number.parseInt(lineMapping[3]) + 1;

    return [sourceFile, lineNumber, columnNumber];
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
      const newStack = this.convertStack(e.stack);
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
