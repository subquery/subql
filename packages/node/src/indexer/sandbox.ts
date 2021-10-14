// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { ApiPromise } from '@polkadot/api';
import { levelFilter } from '@subql/common';
import { Store } from '@subql/types';
import { NodeVM, NodeVMOptions, VMScript } from '@subql/x-vm2';
import { merge } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { getLogger } from '../utils/logger';
import { timeout } from '../utils/promise';

export interface SandboxOption {
  store: Store;
  api: ApiPromise;
  root: string;
  entry: string;
}

const DEFAULT_OPTION: NodeVMOptions = {
  console: 'redirect',
  wasm: false,
  sandbox: {},
  require: {
    builtin: ['assert', 'buffer', 'crypto', 'util', 'path'],
    external: true,
    context: 'sandbox',
  },
  wrapper: 'commonjs',
  sourceExtensions: ['js', 'cjs'],
};

const logger = getLogger('sandbox');

export class IndexerSandbox extends NodeVM {
  private option: SandboxOption;
  private script: VMScript;
  private config: NodeConfig;

  constructor(option: SandboxOption, config: NodeConfig) {
    const { root } = option;
    const vmOption: NodeVMOptions = merge({}, DEFAULT_OPTION, {
      require: {
        root,
        resolve: (moduleName: string) => {
          return require.resolve(moduleName, { paths: [root] });
        },
      },
    });
    super(vmOption);
    this.config = config;
    this.injectGlobals(option);
    this.option = option;
    this.script = new VMScript(
      `
      const mappingFunctions = require('${option.entry}');
      module.exports = mappingFunctions[funcName](...args);
    `,
      path.join(root, 'sandbox'),
    );
  }

  async securedExec(funcName: string, args: unknown[]): Promise<void> {
    this.setGlobal('args', args);
    this.setGlobal('funcName', funcName);
    try {
      await timeout(this.run(this.script), this.config.timeout);
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

  private injectGlobals({ api, store }: SandboxOption) {
    this.freeze(store, 'store');
    this.freeze(api, 'api');
    this.freeze(logger, 'logger');
  }
}
