// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  isCustomCosmosDs,
  isRuntimeCosmosDs,
  SubqlCosmosMessageFilter,
  SubqlCosmosEventFilter,
  SubqlCosmosHandlerKind,
  SubqlCosmosHandler,
  SubqlCosmosDataSource,
  SubqlCosmosHandlerFilter,
  CosmosCustomHandler,
} from '@subql/common-cosmos';

import { NodeConfig, BaseFetchService } from '@subql/node-core';
import { DictionaryQueryEntry, DictionaryQueryCondition } from '@subql/types';

import {
  SubqlCosmosEventHandler,
  SubqlCosmosMessageHandler,
  SubqlCosmosRuntimeHandler,
  SubqlCosmosBlockFilter,
  SubqlCosmosDatasource,
} from '@subql/types-cosmos';
import { MetaData } from '@subql/utils';
import { setWith, sortBy, uniqBy } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import * as CosmosUtil from '../utils/cosmos';
import { isBaseHandler, isCustomHandler } from '../utils/project';
import { ApiService, CosmosClient } from './api.service';
import { ICosmosBlockDispatcher } from './blockDispatcher';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import {
  cosmosBlockToHeader,
  UnfinalizedBlocksService,
} from './unfinalizedBlocks.service';

const BLOCK_TIME_VARIANCE = 5000; //ms
const INTERVAL_PERCENT = 0.9;

const DICTIONARY_VALIDATION_EXCEPTIONS = ['juno-1'];

export function eventFilterToQueryEntry(
  filter: SubqlCosmosEventFilter,
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [
    {
      field: 'type',
      value: filter.type,
      matcher: 'equalTo',
    },
  ];
  if (filter.messageFilter !== undefined) {
    const messageFilter = messageFilterToQueryEntry(
      filter.messageFilter,
    ).conditions.map((f) => {
      if (f.field === 'type') {
        return { ...f, field: 'msgType' };
      }
      return f;
    });

    conditions.push(...messageFilter);
  }
  return {
    entity: 'events',
    conditions: conditions,
  };
}

export function messageFilterToQueryEntry(
  filter: SubqlCosmosMessageFilter,
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [
    {
      field: 'type',
      value: filter.type,
      matcher: 'equalTo',
    },
  ];

  if (filter.values !== undefined) {
    const nested = {};

    // convert nested filters from `msg.swap.input_token` to { msg: { swap: { input_token: 'Token2' } } }
    Object.keys(filter.values).map((key) => {
      const value = filter.values[key];
      setWith(nested, key, value);
    });

    conditions.push({
      field: 'data',
      value: nested as any, // Cast to any for compat with node core
      matcher: 'contains',
    });
  }
  return {
    entity: 'messages',
    conditions: conditions,
  };
}

@Injectable()
export class FetchService extends BaseFetchService<
  ApiService,
  SubqlCosmosDatasource,
  ICosmosBlockDispatcher,
  DictionaryService
> {
  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') project: SubqueryProject,
    @Inject('IBlockDispatcher')
    blockDispatcher: ICosmosBlockDispatcher,
    dictionaryService: DictionaryService,
    dsProcessorService: DsProcessorService,
    dynamicDsService: DynamicDsService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    eventEmitter: EventEmitter2,
    schedulerRegistry: SchedulerRegistry,
  ) {
    super(
      apiService,
      nodeConfig,
      project,
      blockDispatcher,
      dictionaryService,
      dsProcessorService,
      dynamicDsService,
      eventEmitter,
      schedulerRegistry,
    );
  }

  get api(): CosmosClient {
    return this.apiService.unsafeApi;
  }

  buildDictionaryQueryEntries(startBlock: number): DictionaryQueryEntry[] {
    const queryEntries: DictionaryQueryEntry[] = [];

    // Only run the ds that is equal or less than startBlock
    // sort array from lowest ds.startBlock to highest
    const filteredDs = this.project.dataSources
      .concat(this.templateDynamicDatasouces)
      .filter((ds) => ds.startBlock <= startBlock)
      .sort((a, b) => a.startBlock - b.startBlock);

    for (const ds of filteredDs) {
      const plugin = isCustomCosmosDs(ds)
        ? this.dsProcessorService.getDsProcessor(ds)
        : undefined;
      for (const handler of ds.mapping.handlers) {
        const baseHandlerKind = this.getBaseHandlerKind(ds, handler);
        let filterList: SubqlCosmosHandlerFilter[];
        if (isCustomCosmosDs(ds)) {
          const processor = plugin.handlerProcessors[handler.kind];
          if (processor.dictionaryQuery) {
            const queryEntry = processor.dictionaryQuery(
              (handler as CosmosCustomHandler).filter,
              ds,
            ) as DictionaryQueryEntry;
            if (queryEntry) {
              queryEntries.push(queryEntry);
              continue;
            }
          }
          filterList = this.getBaseHandlerFilters<SubqlCosmosHandlerFilter>(
            ds,
            handler.kind,
          );
        } else {
          filterList = [
            (handler as SubqlCosmosEventHandler | SubqlCosmosMessageHandler)
              .filter,
          ];
        }
        // Filter out any undefined
        filterList = filterList.filter(Boolean);
        if (!filterList.length) return [];
        switch (baseHandlerKind) {
          case SubqlCosmosHandlerKind.Block:
            for (const filter of filterList as SubqlCosmosBlockFilter[]) {
              if (filter.modulo === undefined) {
                return [];
              }
            }
            break;
          case SubqlCosmosHandlerKind.Message: {
            for (const filter of filterList as SubqlCosmosMessageFilter[]) {
              if (filter.type !== undefined) {
                queryEntries.push(messageFilterToQueryEntry(filter));
              } else {
                return [];
              }
            }
            break;
          }
          case SubqlCosmosHandlerKind.Event: {
            for (const filter of filterList as SubqlCosmosEventFilter[]) {
              if (filter.type !== undefined) {
                queryEntries.push(eventFilterToQueryEntry(filter));
              } else {
                return [];
              }
            }
            break;
          }
          default:
        }
      }
    }

    return uniqBy(
      queryEntries,
      (item) =>
        `${item.entity}|${JSON.stringify(
          sortBy(item.conditions, (c) => c.field),
        )}`,
    );
  }

  protected async getFinalizedHeight(): Promise<number> {
    // Cosmos has instant finalization
    const height = await this.api.getHeight();
    const header = cosmosBlockToHeader(height);
    this.unfinalizedBlocksService.registerFinalizedBlock(header);

    return height;
  }

  protected async getBestHeight(): Promise<number> {
    return this.api.getHeight();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getChainInterval(): Promise<number> {
    const chainInterval = CosmosUtil.calcInterval(this.api) * INTERVAL_PERCENT;

    return Math.min(BLOCK_TIME_VARIANCE, chainInterval);
  }

  protected async getChainId(): Promise<string> {
    return this.api.getChainId();
  }

  protected getModulos(): number[] {
    const modulos: number[] = [];
    for (const ds of this.project.dataSources) {
      if (isCustomCosmosDs(ds)) {
        continue;
      }
      for (const handler of ds.mapping.handlers) {
        if (
          handler.kind === SubqlCosmosHandlerKind.Block &&
          handler.filter &&
          handler.filter.modulo
        ) {
          modulos.push(handler.filter.modulo);
        }
      }
    }
    return modulos;
  }

  protected async initBlockDispatcher(): Promise<void> {
    await this.blockDispatcher.init(this.resetForNewDs.bind(this));
  }

  protected async preLoopHook(): Promise<void> {
    // Cosmos doesn't need to do anything here
    return Promise.resolve();
  }

  protected async validatateDictionaryMeta(
    metaData: MetaData,
  ): Promise<boolean> {
    const chain = await this.api.getChainId().catch();
    return (
      metaData.chain !== chain &&
      !DICTIONARY_VALIDATION_EXCEPTIONS.find((ele) => ele === chain)
    );
  }

  private getBaseHandlerKind(
    ds: SubqlCosmosDataSource,
    handler: SubqlCosmosHandler,
  ): SubqlCosmosHandlerKind {
    if (isRuntimeCosmosDs(ds) && isBaseHandler(handler)) {
      return (handler as SubqlCosmosRuntimeHandler).kind;
    } else if (isCustomCosmosDs(ds) && isCustomHandler(handler)) {
      const plugin = this.dsProcessorService.getDsProcessor(ds);
      const baseHandler =
        plugin.handlerProcessors[handler.kind]?.baseHandlerKind;
      if (!baseHandler) {
        throw new Error(
          `handler type ${handler.kind} not found in processor for ${ds.kind}`,
        );
      }
      return baseHandler;
    }
  }

  private getBaseHandlerFilters<T extends SubqlCosmosHandlerFilter>(
    ds: SubqlCosmosDataSource,
    handlerKind: string,
  ): T[] {
    if (isCustomCosmosDs(ds)) {
      const plugin = this.dsProcessorService.getDsProcessor(ds);
      const processor = plugin.handlerProcessors[handlerKind];
      return processor.baseFilter instanceof Array
        ? (processor.baseFilter as T[])
        : ([processor.baseFilter] as T[]);
    } else {
      throw new Error(`Expected a custom datasource here`);
    }
  }
}
