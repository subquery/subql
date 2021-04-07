// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { ApiPromise } from '@polkadot/api';
import { levelFilter } from '@subql/common';
import { Store } from '@subql/types';
import { merge } from 'lodash';
import { NodeVM, NodeVMOptions, VMScript } from 'vm2';
import { NodeConfig } from '../configure/NodeConfig';
import { getLogger } from '../utils/logger';
import { timeout } from '../utils/promise';

export interface SandboxOption {
  store: Store;
  api: ApiPromise;
  root: string;
}

const DEFAULT_OPTION: NodeVMOptions = {
  console: 'redirect',
  wasm: false,
  sandbox: {},
  require: {
    builtin: ['assert'],
    external: ['tslib'],
    context: 'sandbox',
  },
  wrapper: 'commonjs',
};

function getProjectEntry(root: string): string {
  const pkgPath = path.join(root, 'package.json');
  try {
    const content = fs.readFileSync(pkgPath).toString();
    const pkg = JSON.parse(content);
    if (!pkg.main) {
      return './dist';
    }
    return pkg.main.startsWith('./') ? pkg.main : `./${pkg.main}`;
  } catch (err) {
    throw new Error(
      `can not find package.json within directory ${this.option.root}`,
    );
  }
}

const logger = getLogger('sandbox');

export class IndexerSandbox extends NodeVM {
  private option: SandboxOption;
  private script: VMScript;
  private config: NodeConfig;
  entry: string;

  constructor(option: SandboxOption, config: NodeConfig) {
    const { root } = option;
    const entry = getProjectEntry(root);
    const vmOption: NodeVMOptions = merge({}, DEFAULT_OPTION, {
      require: {
        root,
      },
    });
    super(vmOption);
    this.config = config;
    this.injectGlobals(option);
    this.option = option;
    this.entry = entry;
    this.script = new VMScript(
      `
      const mappingFunctions = require('${entry}');
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
    }
    this.setGlobal('args', []);
    this.setGlobal('funcName', '');
  }

  private injectGlobals({ api, store }: SandboxOption) {
    this.freeze(store, 'store');
    this.freeze(api, 'api');
    this.freeze(logger, 'logger')

  }
}
