// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {Inject} from '@nestjs/common';
import {
  BaseCustomDataSource,
  SecondLayerHandlerProcessor_0_0_0,
  SecondLayerHandlerProcessor_1_0_0,
  BaseDataSource,
  DsProcessor,
  IProjectNetworkConfig,
} from '@subql/types-core';
import {VMScript} from 'vm2';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {Sandbox, SandboxOption} from './sandbox';
import {ISubqueryProject} from './types';

const logger = getLogger('ds-sandbox');

function isSecondLayerHandlerProcessor_0_0_0<
  InputKinds extends string | symbol,
  HandlerInput extends Record<InputKinds, any>,
  BaseHandlerFilters extends Record<InputKinds, any>,
  F extends Record<string, unknown>,
  E,
  API,
  DS extends BaseCustomDataSource = BaseCustomDataSource
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<InputKinds, HandlerInput, BaseHandlerFilters, F, E, DS, API>
    | SecondLayerHandlerProcessor_1_0_0<InputKinds, HandlerInput, BaseHandlerFilters, F, E, DS, API>
): processor is SecondLayerHandlerProcessor_0_0_0<InputKinds, HandlerInput, BaseHandlerFilters, F, E, DS, API> {
  // Exisiting datasource processors had no concept of specVersion, therefore undefined is equivalent to 0.0.0
  return processor.specVersion === undefined;
}

function isSecondLayerHandlerProcessor_1_0_0<
  InputKinds extends string | symbol,
  HandlerInput extends Record<InputKinds, any>,
  BaseHandlerFilters extends Record<InputKinds, any>,
  F extends Record<string, unknown>,
  E,
  API,
  DS extends BaseCustomDataSource = BaseCustomDataSource
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<InputKinds, HandlerInput, BaseHandlerFilters, F, E, DS, API>
    | SecondLayerHandlerProcessor_1_0_0<InputKinds, HandlerInput, BaseHandlerFilters, F, E, DS, API>
): processor is SecondLayerHandlerProcessor_1_0_0<InputKinds, HandlerInput, BaseHandlerFilters, F, E, DS, API> {
  return processor.specVersion === '1.0.0';
}

export function asSecondLayerHandlerProcessor_1_0_0<
  InputKinds extends string | symbol,
  HandlerInput extends Record<InputKinds, any>,
  BaseHandlerFilters extends Record<InputKinds, any>,
  F extends Record<string, unknown>,
  E,
  API,
  DS extends BaseCustomDataSource = BaseCustomDataSource
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<InputKinds, HandlerInput, BaseHandlerFilters, F, E, DS, API>
    | SecondLayerHandlerProcessor_1_0_0<InputKinds, HandlerInput, BaseHandlerFilters, F, E, DS, API>
): SecondLayerHandlerProcessor_1_0_0<InputKinds, HandlerInput, BaseHandlerFilters, F, E, DS, API> {
  if (isSecondLayerHandlerProcessor_1_0_0(processor)) {
    return processor;
  }

  if (!isSecondLayerHandlerProcessor_0_0_0(processor)) {
    throw new Error('Unsupported ds processor version');
  }

  return {
    ...processor,
    specVersion: '1.0.0',
    filterProcessor: (params) => processor.filterProcessor(params.filter, params.input, params.ds),
    transformer: (params) =>
      processor.transformer(params.input, params.ds, params.api, params.assets).then((res) => [res]),
  };
}

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

export function getDsProcessor<
  P,
  DS extends BaseDataSource = BaseDataSource,
  CDS extends DS & BaseCustomDataSource = DS & BaseCustomDataSource
>(
  ds: CDS,
  isCustomDs: (ds: any) => boolean,
  processorCache: Record<string, P>,
  root: string,
  chainId: string,
  nodeConfig: NodeConfig
): P {
  if (!isCustomDs(ds)) {
    throw new Error(`data source is not a custom data source`);
  }
  if (!processorCache[ds.processor.file]) {
    const sandbox = new DsPluginSandbox<P>(
      {
        root: root,
        entry: ds.processor.file,
        chainId: chainId,
      },
      nodeConfig
    );
    try {
      processorCache[ds.processor.file] = sandbox.getDsPlugin();
    } catch (e: any) {
      logger.error(e, `not supported ds @${ds.kind}`);
      throw e;
    }
  }
  return processorCache[ds.processor.file] as unknown as P;
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

  async validateProjectCustomDatasources(dataSources: DS[]): Promise<void> {
    await this.validateCustomDs(dataSources.filter((ds) => this.isCustomDs(ds)) as unknown as CDS[]);
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
