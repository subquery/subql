// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { Injectable } from '@nestjs/common';
import { SubqlCosmosDataSource } from '@subql/common-cosmos';
import { Store } from '@subql/types-cosmos';
import { levelFilter } from '@subql/utils';
import { merge } from 'lodash';
import { NodeVM, NodeVMOptions, VMScript } from 'vm2';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { getLogger } from '../utils/logger';
import { getProjectEntry } from '../utils/project';
import { timeout } from '../utils/promise';
import { getYargsOption } from '../yargs';
import { ApiService, CosmosSafeClient } from './api.service';
import { StoreService } from './store.service';

const { argv } = getYargsOption();

export interface SandboxOption {
  store?: Store;
  script: string;
  root: string;
  entry: string;
}

const DEFAULT_OPTION: NodeVMOptions = {
  console: 'redirect',
  wasm: argv.unsafe,
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
        `const mappingFunctions = require('${option.entry}');
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

  private injectGlobals({ store }: SandboxOption) {
    if (store) {
      this.freeze(store, 'store');
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

  getDsProcessor(ds: SubqlProjectDs, api: CosmosSafeClient): IndexerSandbox {
    const entry = this.getDataSourceEntry(ds);
    let processor = this.processorCache[entry];
    if (!processor) {
      processor = new IndexerSandbox(
        {
          // api: await this.apiService.getPatchedApi(),
          store: this.storeService.getStore(),
          root: this.project.root,
          script: ds.mapping.entryScript,
          entry,
        },
        this.nodeConfig,
      );
      this.processorCache[entry] = processor;
    }
    processor.freeze(api, 'api');
    if (argv.unsafe) {
      processor.freeze(this.apiService.getApi().StargateClient, 'unsafeApi');
    }
    return processor;
  }

  private getDataSourceEntry(ds: SubqlCosmosDataSource): string {
    return getProjectEntry(this.project.root);
  }
}
