// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { isCustomCosmosDs } from '@subql/common-cosmos';
import {
  SubqlCosmosCustomDatasource,
  SubqlCosmosDatasourceProcessor,
  SubqlCosmosDatasource,
} from '@subql/types-cosmos';
import { VMScript } from 'vm2';
import { SubqueryCosmosProject } from '../configure/cosmosproject.model';
import { getLogger } from '../utils/logger';
import { Sandbox } from './sandboxcosmos.service';

export interface DsPluginSandboxOption {
  root: string;
  entry: string;
  script: string;
}

const logger = getLogger('ds-sandbox');

export class CosmosDsPluginSandbox extends Sandbox {
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

  getDsPlugin<D extends string>(): SubqlCosmosDatasourceProcessor<D> {
    return this.run(this.script);
  }
}

@Injectable()
export class CosmosDsProcessorService {
  private processorCache: {
    [entry: string]: SubqlCosmosDatasourceProcessor<string>;
  } = {};
  constructor(private project: SubqueryCosmosProject) {}

  async validateCustomDs(
    datasources: SubqlCosmosCustomDatasource[],
  ): Promise<void> {
    for (const ds of datasources) {
      const processor = this.getDsProcessor(ds);
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
        //filter here
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
      (this.project.dataSources as SubqlCosmosDatasource[]).filter(
        isCustomCosmosDs,
      ),
    );
  }

  getDsProcessor<D extends string>(
    ds: SubqlCosmosCustomDatasource<string>,
  ): SubqlCosmosDatasourceProcessor<D> {
    if (!isCustomCosmosDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }
    if (!this.processorCache[ds.processor.file]) {
      const sandbox = new CosmosDsPluginSandbox({
        root: this.project.root,
        entry: ds.processor.file,
        script: null,
      });
      try {
        this.processorCache[ds.processor.file] = sandbox.getDsPlugin<D>();
      } catch (e) {
        logger.error(`not supported ds @${ds.kind}`);
        throw e;
      }
    }
    return this.processorCache[
      ds.processor.file
    ] as unknown as SubqlCosmosDatasourceProcessor<D>;
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAssets(
    ds: SubqlCosmosCustomDatasource,
  ): Promise<Record<string, string>> {
    if (!isCustomCosmosDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }
    if (!ds.assets) {
      return {};
    }

    const res: Record<string, string> = {};

    for (const [name, { file }] of ds.assets) {
      try {
        res[name] = fs.readFileSync(path.join(this.project.root, file), {
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
