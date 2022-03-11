// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import {
  isCustomDs,
  SubstrateCustomDataSource,
  SubstrateDataSource,
  SubstrateDatasourceProcessor,
  SubstrateNetworkFilter,
} from '@subql/common-substrate';

import { VMScript } from 'vm2';
import { SubqueryProject } from '../configure/SubqueryProject';
import { getLogger } from '../utils/logger';
import { Sandbox } from './sandbox.service';

export interface DsPluginSandboxOption {
  root: string;
  entry: string;
  script: string;
}

const logger = getLogger('ds-sandbox');

export class DsPluginSandbox extends Sandbox {
  constructor(option: DsPluginSandboxOption) {
    super(
      option,
      new VMScript(
        `module.exports = require('${option.entry}').default;`,
        path.join(option.root, 'ds_sandbox'),
      ),
    );
    this.freeze(logger, 'logger');
  }

  getDsPlugin<
    D extends string,
    T extends SubstrateNetworkFilter,
  >(): SubstrateDatasourceProcessor<D, T> {
    return this.run(this.script);
  }
}

@Injectable()
export class DsProcessorService {
  private processorCache: {
    [entry: string]: SubstrateDatasourceProcessor<
      string,
      SubstrateNetworkFilter
    >;
  } = {};
  constructor(private project: SubqueryProject) {}

  async validateCustomDs(
    datasources: SubstrateCustomDataSource[],
  ): Promise<void> {
    for (const ds of datasources) {
      const processor = this.getDsProcessor(ds);
      /* Standard validation applicable to all custom ds and processors */
      if (ds.kind !== processor.kind) {
        throw new Error(
          `ds kind (${ds.kind}) doesnt match processor (${processor.kind})`,
        );
      }

      for (const handler of ds.mapping.handlers) {
        if (!(handler.kind in processor.handlerProcessors)) {
          throw new Error(
            `ds kind ${handler.kind} not one of ${Object.keys(
              processor.handlerProcessors,
            ).join(', ')}`,
          );
        }
      }

      ds.mapping.handlers.map((handler) =>
        processor.handlerProcessors[handler.kind].filterValidator(
          handler.filter,
        ),
      );

      /* Additional processor specific validation */
      processor.validate(ds, await this.getAssets(ds));
    }
  }

  async validateProjectCustomDatasources(): Promise<void> {
    await this.validateCustomDs(
      (this.project.dataSources as SubstrateDataSource[]).filter(isCustomDs),
    );
  }

  getDsProcessor<D extends string, T extends SubstrateNetworkFilter>(
    ds: SubstrateCustomDataSource<string, T>,
  ): SubstrateDatasourceProcessor<D, T> {
    if (!isCustomDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }
    if (!this.processorCache[ds.processor.file]) {
      const sandbox = new DsPluginSandbox({
        root: this.project.root,
        entry: ds.processor.file,
        script: null /* TODO get working with Readers, same as with sandbox */,
      });
      try {
        this.processorCache[ds.processor.file] = sandbox.getDsPlugin<D, T>();
      } catch (e) {
        logger.error(`not supported ds @${ds.kind}`);
        throw e;
      }
    }
    return this.processorCache[
      ds.processor.file
    ] as unknown as SubstrateDatasourceProcessor<D, T>;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getAssets(
    ds: SubstrateCustomDataSource,
  ): Promise<Record<string, string>> {
    if (!isCustomDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }

    if (!ds.assets) {
      return {};
    }

    const res: Record<string, string> = {};

    for (const [name, { file }] of ds.assets) {
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
