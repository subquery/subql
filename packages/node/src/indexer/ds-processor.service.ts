// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import {
  SubqlCustomDatasource,
  SubqlDatasourceProcessor,
  SubqlNetworkFilter,
} from '@subql/types';
import { VMScript } from '@subql/x-vm2';
import { SubqueryProject } from '../configure/project.model';
import { getLogger } from '../utils/logger';
import { isCustomDs } from '../utils/project';
import { Sandbox } from './sandbox.service';

export interface DsPluginSandboxOption {
  root: string;
  entry: string;
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

  async validateCustomDs(): Promise<void> {
    for (const ds of this.project.dataSources.filter(isCustomDs)) {
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

  getDsProcessor<D extends string, T extends SubqlNetworkFilter>(
    ds: SubqlCustomDatasource<string, T>,
  ): SubqlDatasourceProcessor<D, T> {
    if (!isCustomDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }
    if (!this.processorCache[ds.processor.file]) {
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
    return this.processorCache[
      ds.processor.file
    ] as unknown as SubqlDatasourceProcessor<D, T>;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getAssets(ds: SubqlCustomDatasource): Promise<Record<string, string>> {
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
        res[name] = fs.readFileSync(path.join(this.project.path, file), {
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
