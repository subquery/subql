// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { Injectable } from '@nestjs/common';
import {
  SubqlCustomDatasource,
  SubqlDatasourceProcessor,
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
        resolve: (moduleName: string) => {
          return require.resolve(moduleName, { paths: [option.root] });
        },
      },
    });
    super(vmOption);
    this.option = option;
    this.entry = option.entry;
    this.script = new VMScript(
      `
      module.exports = require('${this.entry}').default;
    `,
      path.join(option.root, 'ds_sandbox'),
    );
  }

  getDsPlugin<
    D extends string,
    T extends SubqlNetworkFilter,
  >(): SubqlDatasourceProcessor<D, T> {
    return this.run(this.script);
  }
}

@Injectable()
export class DsProcessorService {
  private processorCache: {
    [entry: string]: SubqlDatasourceProcessor<string, SubqlNetworkFilter>;
  } = {};
  constructor(private project: SubqueryProject) {}

  validateCustomDs(): void {
    for (const ds of this.project.dataSources.filter(isCustomDs)) {
      this.getDsProcessor(ds).validate(ds);
    }
  }

  getDsProcessor<D extends string, T extends SubqlNetworkFilter>(
    ds: SubqlCustomDatasource<string, T>,
  ): SubqlDatasourceProcessor<D, T> {
    if (!this.processorCache[ds.processor.file]) {
      if (isCustomDs(ds)) {
        const sandbox = new DsPluginSandbox({
          root: this.project.path,
          entry: ds.processor.file,
        });
        try {
          this.processorCache[ds.processor.file] = sandbox.getDsPlugin<D, T>();
        } catch (e) {
          logger.error(`not supported ds @${ds.kind}`);
          throw e;
        }
      }
    }
    return this.processorCache[
      ds.processor.file
    ] as unknown as SubqlDatasourceProcessor<D, T>;
  }
}
