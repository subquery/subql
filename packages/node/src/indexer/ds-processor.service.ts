// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
      const processor = this.getDsProcessor(ds);
      /* Standard validation applicable to all custom ds and processors */
      if (ds.kind !== processor.kind) {
        throw new Error('ds kind doesnt match processor');
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

      /* Additional processor specific validation */
      processor.validate(ds);
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
}
