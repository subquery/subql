// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { isRuntimeDataSourceV0_2_0, levelFilter } from '@subql/common';
import { Store, SubqlDatasource } from '@subql/types';
import { NodeVM, NodeVMOptions, VMScript } from '@subql/x-vm2';
import { merge } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { getLogger } from '../utils/logger';
import { getProjectEntry } from '../utils/project';
import { timeout } from '../utils/promise';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { StoreService } from './store.service';

const { argv } = getYargsOption();

export interface SandboxOption {
  store?: Store;
  api?: ApiPromise;
  root: string;
  entry: string;
}

const DEFAULT_OPTION: NodeVMOptions = {
  console: 'redirect',
  wasm: false,
  sandbox: {},
  require: {
    builtin: argv.unsafe
      ? ['*']
      : ['assert', 'buffer', 'crypto', 'util', 'path'],
    external: true,
    context: 'sandbox',
  },
  wrapper: 'commonjs',
  sourceExtensions: ['js', 'cjs'],
};

const logger = getLogger('sandbox');

export class Sandbox extends NodeVM {
  constructor(option: SandboxOption, protected readonly script: VMScript) {
    super(
      merge(DEFAULT_OPTION, {
        require: {
          root: option.root,
          resolve: (moduleName: string) => {
            return require.resolve(moduleName, { paths: [option.root] });
          },
        },
      }),
    );
  }

  async runTimeout<T = unknown>(duration: number): Promise<T> {
    return timeout(this.run(this.script), duration);
  }
}

export class IndexerSandbox extends Sandbox {
  constructor(option: SandboxOption, private readonly config: NodeConfig) {
    super(
      option,
      new VMScript(
        `
      const mappingFunctions = require('${option.entry}');
      module.exports = mappingFunctions[funcName](...args);
    `,
        path.join(option.root, 'sandbox'),
      ),
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

  private injectGlobals({ api, store }: SandboxOption) {
    if (store) {
      this.freeze(store, 'store');
    }
    if (api) {
      this.freeze(api, 'api');
    }
    this.freeze(logger, 'logger');
  }
}

@Injectable()
export class SandboxService {
  private processorCache: Record<string, IndexerSandbox> = {};

  constructor(
    private readonly apiService: ApiService,
    private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    private readonly project: SubqueryProject,
  ) {}

  async getDsProcessor(ds: SubqlDatasource): Promise<IndexerSandbox> {
    const entry = this.getDataSourceEntry(ds);

    if (!this.processorCache[entry]) {
      this.processorCache[entry] = new IndexerSandbox(
        {
          api: await this.apiService.getPatchedApi(),
          entry,
          root: this.project.path,
          store: this.storeService.getStore(),
        },
        this.nodeConfig,
      );
    }

    return this.processorCache[entry];
  }

  private getDataSourceEntry(ds: SubqlDatasource): string {
    if (isRuntimeDataSourceV0_2_0(ds)) {
      return ds.mapping.file;
    } else {
      return getProjectEntry(this.project.path);
    }
  }
}
