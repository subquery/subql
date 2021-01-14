// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import fs from 'fs';
import { NodeVM, NodeVMOptions, VMScript } from 'vm2';
import { Store } from '@subql/types';
import { ApiPromise } from '@polkadot/api';
import { merge } from 'lodash';

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

export class IndexerSandbox extends NodeVM {
  private option: SandboxOption;
  private script: VMScript;
  entry: string;

  constructor(option: SandboxOption) {
    const { root } = option;
    const entry = getProjectEntry(root);
    const vmOption: NodeVMOptions = merge({}, DEFAULT_OPTION, {
      require: {
        root,
      },
    });
    super(vmOption);
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

  async securedExec(funcName: string, args: any[]): Promise<void> {
    this.setGlobal('args', args);
    this.setGlobal('funcName', funcName);
    await this.run(this.script);
    this.setGlobal('args', []);
    this.setGlobal('funcName', '');
  }

  private injectGlobals({ api, store }: SandboxOption) {
    this.freeze(store, 'store');
    this.freeze(api, 'api');
  }
}
