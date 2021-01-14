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
  entry: string;

  constructor(option: SandboxOption) {
    const { store, api, root } = option;
    const entry = getProjectEntry(root);
    const vmOption: NodeVMOptions = merge({}, DEFAULT_OPTION, {
      sandbox: {
        store,
        api,
        __subqlProjectEntry: entry,
      },
      require: {
        root,
      },
    });
    super(vmOption);
    this.option = option;
    this.entry = entry;
  }

  async securedExec(func: string, args: any[]): Promise<void> {
    this.setGlobal('args', args);
    const script = new VMScript(
      `
      const {${func}: func} = require(__subqlProjectEntry);
      module.exports = func(...args);
    `,
      path.join(this.option.root, 'sandbox'),
    );
    await this.run(script);
    this.setGlobal('args', []);
  }
}
