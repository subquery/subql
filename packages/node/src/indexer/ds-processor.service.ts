// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { isCustomCosmosDs } from '@subql/common-cosmos';
import {
  SecondLayerHandlerProcessor_0_0_0,
  SecondLayerHandlerProcessor_1_0_0,
  SubqlCosmosCustomDatasource,
  SubqlCosmosDatasourceProcessor,
  SubqlCosmosDatasource,
  SubqlCosmosHandlerKind,
} from '@subql/types-cosmos';
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

export function isSecondLayerHandlerProcessor_0_0_0<
  K extends SubqlCosmosHandlerKind,
  F,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource,
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<K, F, E, DS>
    | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>,
): processor is SecondLayerHandlerProcessor_0_0_0<K, F, E, DS> {
  // Exisiting datasource processors had no concept of specVersion, therefore undefined is equivalent to 0.0.0
  return processor.specVersion === undefined;
}

export function isSecondLayerHandlerProcessor_1_0_0<
  K extends SubqlCosmosHandlerKind,
  F,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource,
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<K, F, E, DS>
    | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>,
): processor is SecondLayerHandlerProcessor_1_0_0<K, F, E, DS> {
  return processor.specVersion === '1.0.0';
}

export function asSecondLayerHandlerProcessor_1_0_0<
  K extends SubqlCosmosHandlerKind,
  F,
  E,
  DS extends SubqlCosmosCustomDatasource = SubqlCosmosCustomDatasource,
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<K, F, E, DS>
    | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>,
): SecondLayerHandlerProcessor_1_0_0<K, F, E, DS> {
  if (isSecondLayerHandlerProcessor_1_0_0(processor)) {
    return processor;
  }

  if (!isSecondLayerHandlerProcessor_0_0_0(processor)) {
    throw new Error('Unsupported ds processor version');
  }

  return {
    ...processor,
    specVersion: '1.0.0',
    filterProcessor: (params) =>
      processor.filterProcessor(params.filter, params.input, params.ds),
    transformer: (params) =>
      processor
        .transformer(params.input, params.ds, params.api, params.assets)
        .then((res) => [res]),
  };
}

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

  getDsPlugin<D extends string>(): SubqlCosmosDatasourceProcessor<
    D,
    undefined
  > {
    return this.run(this.script);
  }
}

@Injectable()
export class DsProcessorService {
  private processorCache: {
    [entry: string]: SubqlCosmosDatasourceProcessor<string, undefined>;
  } = {};
  constructor(private project: SubqueryProject) {}

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
  ): SubqlCosmosDatasourceProcessor<D, undefined> {
    if (!isCustomCosmosDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }
    if (!this.processorCache[ds.processor.file]) {
      const sandbox = new DsPluginSandbox({
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
    ] as unknown as SubqlCosmosDatasourceProcessor<D, undefined>;
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
