// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import path from 'path';
import { Injectable } from '@nestjs/common';
import {
  SubqlCustomDatasource,
  SubqlDatasourcePlugin,
  SubqlNetworkFilter,
} from '@subql/types';
import { NodeVM, NodeVMOptions, VMScript } from '@subql/x-vm2';
import { merge } from 'lodash';
import { SubqueryProject } from '../configure/project.model';
import { getLogger } from '../utils/logger';
import { isCustomDs } from '../utils/project';

export interface DsPluginSandboxOption {
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

const logger = getLogger('ds-sandbox');

export class DsPluginSandbox extends NodeVM {
  private option: DsPluginSandboxOption;
  private script: VMScript;
  private entry: string;

  constructor(option: DsPluginSandboxOption) {
    const vmOption: NodeVMOptions = merge({}, DEFAULT_OPTION, {
      require: {
        root: option.root,
        resolve: (moduleName) => {
          return require.resolve(moduleName, { paths: [option.root] });
        },
      },
    });
    super(vmOption);
    this.option = option;
    this.entry = option.entry;
    this.script = new VMScript(
      `
      module.exports = require('${this.entry}');
    `,
      path.join(option.root, 'ds_sandbox'),
    );
  }

  getDsPlugin<
    D extends string,
    T extends SubqlNetworkFilter,
  >(): SubqlDatasourcePlugin<D, T> {
    return this.run(this.script);
  }
}

@Injectable()
export class DsPluginService {
  private pluginCache: {
    [entry: string]: SubqlDatasourcePlugin<string, SubqlNetworkFilter>;
  };
  constructor(private project: SubqueryProject) {}

  getDsPlugin<D extends string, T extends SubqlNetworkFilter>(
    ds: SubqlCustomDatasource<string, T>,
  ): SubqlDatasourcePlugin<D, T> {
    if (!this.pluginCache[ds.processor.file]) {
      if (isCustomDs(ds)) {
        const sandbox = new DsPluginSandbox({
          root: this.project.path,
          entry: ds.processor.file,
        });
        try {
          this.pluginCache[ds.processor.file] = sandbox.getDsPlugin<D, T>();
        } catch (e) {
          logger.error(`not supported ds @${ds.kind}`);
          throw e;
        }
      }
    }
    return this.pluginCache[
      ds.processor.file
    ] as unknown as SubqlDatasourcePlugin<D, T>;
  }
}
