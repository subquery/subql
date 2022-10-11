// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Store} from '@subql/types';
import {levelFilter} from '@subql/utils';
import {merge} from 'lodash';
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
  }

  async runTimeout<T = unknown>(duration: number): Promise<T> {
    return timeout(this.run(this.script), duration);
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
