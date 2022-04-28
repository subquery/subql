// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { Injectable } from '@nestjs/common';
import { SubqlCosmosDatasource, Store } from '@subql/types-cosmos';
import { levelFilter } from '@subql/utils';
import { merge } from 'lodash';
import { NodeVM, NodeVMOptions, VMScript } from 'vm2';
import { SubqueryCosmosProject } from '../configure/cosmosproject.model';
import { NodeConfig } from '../configure/NodeConfig';
import { getLogger } from '../utils/logger';
import { timeout } from '../utils/promise';
import { getYargsOption } from '../yargs';
import { ApiCosmosService } from './apicosmos.service';
import { StoreService } from './store.service';

const { argv } = getYargsOption();

export interface SandboxOption {
  store?: Store;
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
      : ['assert', 'buffer', 'crypto', 'util', 'path'], // No events here without unsafe
    external: true,
    context: 'sandbox',
    mock: {
      events: undefined, // Remove events, I think this will cause @Cosmos-money/Cosmos.js to use a js implementation rather than native one
    },
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
    //logger.info(JSON.stringify(args));
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
export class SandboxCosmosService {
  private processorCache: Record<string, IndexerSandbox> = {};

  constructor(
    private readonly apiService: ApiCosmosService,
    private readonly storeService: StoreService,
    private readonly nodeConfig: NodeConfig,
    private readonly project: SubqueryCosmosProject,
  ) {}

  getDsProcessor(ds: SubqlCosmosDatasource): IndexerSandbox {
    const entry = this.getDataSourceEntry(ds);
    let processor = this.processorCache[entry];
    if (!processor) {
      processor = new IndexerSandbox(
        {
          entry,
          root: this.project.root,
          store: this.storeService.getStore(),
        },
        this.nodeConfig,
      );
      this.processorCache[entry] = processor;
    }
    /* Disable api because we cannot set to a point in time */
    // processor.freeze(this.apiService.getApi().LCDClient, 'api');
    if (argv.unsafe) {
      processor.freeze(this.apiService.getApi().StargateClient, 'unsafeApi');
    }
    return processor;
  }

  private getDataSourceEntry(ds: SubqlCosmosDatasource): string {
    return ds.mapping.file;
  }
}
