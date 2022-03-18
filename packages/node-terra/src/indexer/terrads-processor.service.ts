// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { isCustomTerraDs } from '@subql/common-terra';
import {
  SubqlTerraCustomDatasource,
  SubqlTerraDatasourceProcessor,
  SubqlTerraDatasource,
} from '@subql/types-terra';
import { VMScript } from '@subql/x-vm2';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { getLogger } from '../utils/logger';
import { Sandbox } from './sandboxterra.service';

export interface DsPluginSandboxOption {
  root: string;
  entry: string;
}

const logger = getLogger('ds-sandbox');

export class TerraDsPluginSandbox extends Sandbox {
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

  getDsPlugin<D extends string>(): SubqlTerraDatasourceProcessor<D> {
    return this.run(this.script);
  }
}

@Injectable()
export class TerraDsProcessorService {
  private processorCache: {
    [entry: string]: SubqlTerraDatasourceProcessor<string>;
  } = {};
  constructor(private project: SubqueryTerraProject) {}

  async validateCustomDs(
    datasources: SubqlTerraCustomDatasource[],
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
      (this.project.dataSources as SubqlTerraDatasource[]).filter(
        isCustomTerraDs,
      ),
    );
  }

  getDsProcessor<D extends string>(
    ds: SubqlTerraCustomDatasource<string>,
  ): SubqlTerraDatasourceProcessor<D> {
    if (!isCustomTerraDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }
    if (!this.processorCache[ds.processor.file]) {
      const sandbox = new TerraDsPluginSandbox({
        root: this.project.root,
        entry: ds.processor.file,
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
    ] as unknown as SubqlTerraDatasourceProcessor<D>;
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAssets(
    ds: SubqlTerraCustomDatasource,
  ): Promise<Record<string, string>> {
    if (!isCustomTerraDs(ds)) {
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
