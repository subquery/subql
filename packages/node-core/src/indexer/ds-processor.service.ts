// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {Inject} from '@nestjs/common';
import {BaseCustomDataSource, BaseDataSource} from '@subql/common';
import {VMScript} from 'vm2';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {Sandbox, SandboxOption} from './sandbox';
import {DsProcessor, IProjectNetworkConfig, ISubqueryProject} from './types';

const logger = getLogger('ds-sandbox');

class DsPluginSandbox<P> extends Sandbox {
  constructor(option: Omit<SandboxOption, 'store'>, nodeConfig: NodeConfig) {
    super(
      option,
      new VMScript(`module.exports = require('${option.entry}').default;`, path.join(option.root, 'ds_sandbox')),
      nodeConfig
    );
    this.freeze(logger, 'logger');
  }

  getDsPlugin(): P {
    return this.run(this.script);
  }
}

export abstract class BaseDsProcessorService<
  DS extends BaseDataSource = BaseDataSource,
  CDS extends DS & BaseCustomDataSource = DS & BaseCustomDataSource,
  P extends DsProcessor<CDS> = DsProcessor<CDS>
> {
  private processorCache: Record<string, P> = {};

  protected abstract isCustomDs(ds: DS): ds is CDS;

  constructor(
    @Inject('ISubqueryProject') private readonly project: ISubqueryProject<IProjectNetworkConfig, DS>,
    private readonly nodeConfig: NodeConfig
  ) {}

  async validateCustomDs(datasources: CDS[]): Promise<void> {
    for (const ds of datasources) {
      const processor = this.getDsProcessor(ds);
      /* Standard validation applicable to all custom ds and processors */
      if (ds.kind !== processor.kind) {
        throw new Error(`ds kind (${ds.kind}) doesnt match processor (${processor.kind})`);
      }

      for (const handler of ds.mapping.handlers) {
        if (!(handler.kind in processor.handlerProcessors)) {
          throw new Error(`ds kind ${handler.kind} not one of ${Object.keys(processor.handlerProcessors).join(', ')}`);
        }
      }

      ds.mapping.handlers.map((handler) => processor.handlerProcessors[handler.kind].filterValidator(handler.filter));

      /* Additional processor specific validation */
      processor.validate(ds, await this.getAssets(ds));
    }
  }

  async validateProjectCustomDatasources(): Promise<void> {
    await this.validateCustomDs(this.project.dataSources.filter((ds) => this.isCustomDs(ds)) as unknown as CDS[]);
  }

  getDsProcessor(ds: CDS): P {
    if (!this.isCustomDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }
    if (!this.processorCache[ds.processor.file]) {
      const sandbox = new DsPluginSandbox<P>(
        {
          root: this.project.root,
          entry: ds.processor.file,
          chainId: this.project.network.chainId,
        },
        this.nodeConfig
      );
      try {
        this.processorCache[ds.processor.file] = sandbox.getDsPlugin();
      } catch (e: any) {
        logger.error(e, `not supported ds @${ds.kind}`);
        throw e;
      }
    }
    return this.processorCache[ds.processor.file] as unknown as P;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getAssets(ds: CDS): Promise<Record<string, string>> {
    if (!this.isCustomDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }

    if (!ds.assets) {
      return {};
    }

    const res: Record<string, string> = {};

    for (const [name, {file}] of ds.assets) {
      // TODO update with https://github.com/subquery/subql/pull/511
      try {
        res[name] = fs.readFileSync(file, {
          encoding: 'utf8',
        });
      } catch (e) {
        logger.error(`Failed to load datasource asset ${file}`);
        throw e;
      }
    }

    return res;
  }
}
