// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ApiPromise } from '@polkadot/api';

import {
  isCustomDs,
  isRuntimeDs,
  SubstrateBlockFilter,
  SubstrateCallFilter,
  SubstrateDataSource,
  SubstrateEventFilter,
  SubstrateHandler,
  SubstrateHandlerKind,
  SubstrateRuntimeHandlerFilter,
} from '@subql/common-substrate';
import { NodeConfig, BaseFetchService, getModulos } from '@subql/node-core';
import { SubstrateCustomHandler, SubstrateDatasource } from '@subql/types';
import {
  DictionaryQueryCondition,
  DictionaryQueryEntry,
} from '@subql/types-core';
import { sortBy, uniqBy } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { isBaseHandler, isCustomHandler } from '../utils/project';
import { calcInterval } from '../utils/substrate';
import { ApiService } from './api.service';
import { ISubstrateBlockDispatcher } from './blockDispatcher/substrate-block-dispatcher';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { ProjectService } from './project.service';
import { RuntimeService } from './runtime/runtimeService';
import {
  substrateHeaderToHeader,
  UnfinalizedBlocksService,
} from './unfinalizedBlocks.service';

const BLOCK_TIME_VARIANCE = 5000; //ms
const INTERVAL_PERCENT = 0.9;

function eventFilterToQueryEntry(
  filter: SubstrateEventFilter,
): DictionaryQueryEntry {
  return {
    entity: 'events',
    conditions: [
      { field: 'module', value: filter.module },
      {
        field: 'event',
        value: filter.method,
      },
    ],
  };
}

function callFilterToQueryEntry(
  filter: SubstrateCallFilter,
): DictionaryQueryEntry {
  return {
    entity: 'extrinsics',
    conditions: Object.keys(filter).map(
      (key) =>
        ({
          field: key === 'method' ? 'call' : key,
          value: filter[key],
        } as DictionaryQueryCondition),
    ),
  };
}

@Injectable()
export class FetchService extends BaseFetchService<
  SubstrateDatasource,
  ISubstrateBlockDispatcher,
  DictionaryService
> {
  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('IProjectService') projectService: ProjectService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    @Inject('IBlockDispatcher')
    blockDispatcher: ISubstrateBlockDispatcher,
    dictionaryService: DictionaryService,
    private dsProcessorService: DsProcessorService,
    dynamicDsService: DynamicDsService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    eventEmitter: EventEmitter2,
    schedulerRegistry: SchedulerRegistry,
    private runtimeService: RuntimeService,
  ) {
    super(
      nodeConfig,
      projectService,
      project.network,
      blockDispatcher,
      dictionaryService,
      dynamicDsService,
      eventEmitter,
      schedulerRegistry,
    );
  }

  get api(): ApiPromise {
    return this.apiService.unsafeApi;
  }

  // eslint-disable-next-line complexity
  protected buildDictionaryQueryEntries(
    dataSources: SubstrateDatasource[],
  ): DictionaryQueryEntry[] {
    const queryEntries: DictionaryQueryEntry[] = [];

    for (const ds of dataSources) {
      const plugin = isCustomDs(ds)
        ? this.dsProcessorService.getDsProcessor(ds)
        : undefined;
      for (const handler of ds.mapping.handlers) {
        const baseHandlerKind = this.getBaseHandlerKind(ds, handler);
        let filterList: SubstrateRuntimeHandlerFilter[];
        if (isCustomDs(ds)) {
          const processor = plugin.handlerProcessors[handler.kind];
          if (processor.dictionaryQuery) {
            const queryEntry = processor.dictionaryQuery(
              (handler as SubstrateCustomHandler).filter,
              ds,
            );
            if (queryEntry) {
              queryEntries.push(queryEntry);
              continue;
            }
          }
          filterList =
            this.getBaseHandlerFilters<SubstrateRuntimeHandlerFilter>(
              ds,
              handler.kind,
            );
        } else {
          filterList = [handler.filter];
        }
        // Filter out any undefined
        filterList = filterList.filter(Boolean);
        if (!filterList.length) return [];
        switch (baseHandlerKind) {
          case SubstrateHandlerKind.Block:
            for (const filter of filterList as SubstrateBlockFilter[]) {
              if (filter.modulo === undefined) {
                return [];
              }
            }
            break;
          case SubstrateHandlerKind.Call: {
            for (const filter of filterList as SubstrateCallFilter[]) {
              if (
                filter.module !== undefined ||
                filter.method !== undefined ||
                filter.isSigned !== undefined ||
                filter.success !== undefined
              ) {
                queryEntries.push(callFilterToQueryEntry(filter));
              } else {
                return [];
              }
            }
            break;
          }
          case SubstrateHandlerKind.Event: {
            for (const filter of filterList as SubstrateEventFilter[]) {
              if (filter.module !== undefined || filter.method !== undefined) {
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
    const finalizedHash = await this.api.rpc.chain.getFinalizedHead();
    const finalizedHeader = await this.api.rpc.chain.getHeader(finalizedHash);

    const header = substrateHeaderToHeader(finalizedHeader);

    this.unfinalizedBlocksService.registerFinalizedBlock(header);
    return header.blockHeight;
  }

  protected getGenesisHash(): string {
    return this.apiService.networkMeta.genesisHash;
  }

  protected async getBestHeight(): Promise<number> {
    const bestHeader = await this.api.rpc.chain.getHeader();
    return bestHeader.number.toNumber();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getChainInterval(): Promise<number> {
    const chainInterval = calcInterval(this.api)
      .muln(INTERVAL_PERCENT)
      .toNumber();

    return Math.min(BLOCK_TIME_VARIANCE, chainInterval);
  }

  protected getModulos(): number[] {
    return getModulos(
      this.projectService.getAllDataSources(),
      isCustomDs,
      SubstrateHandlerKind.Block,
    );
  }

  protected async initBlockDispatcher(): Promise<void> {
    await this.blockDispatcher.init(
      this.resetForNewDs.bind(this),
      this.runtimeService,
    );
  }

  protected async preLoopHook({ startHeight }): Promise<void> {
    this.runtimeService.init(this.getLatestFinalizedHeight.bind(this));

    if (this.dictionaryService.useDictionary) {
      // const rawSpecVersions = await this.dictionaryService.getSpecVersionsRaw();
      // this.runtimeService.setSpecVersionMap(rawSpecVersions);

      await this.runtimeService.syncDictionarySpecVersions();
    } else {
      this.runtimeService.setSpecVersionMap(undefined);
    }

    // setup parentSpecVersion
    await this.runtimeService.specChanged(startHeight);
    await this.runtimeService.prefetchMeta(startHeight);
  }

  private getBaseHandlerKind(
    ds: SubstrateDataSource,
    handler: SubstrateHandler,
  ): SubstrateHandlerKind {
    if (isRuntimeDs(ds) && isBaseHandler(handler)) {
      return handler.kind;
    } else if (isCustomDs(ds) && isCustomHandler(handler)) {
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

  private getBaseHandlerFilters<T extends SubstrateRuntimeHandlerFilter>(
    ds: SubstrateDataSource,
    handlerKind: string,
  ): T[] {
    if (isCustomDs(ds)) {
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
