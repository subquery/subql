// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';

import {
  SorobanHandlerKind,
  SubqlSorobanProcessorOptions,
} from '@subql/common-soroban';
import {
  NodeConfig,
  BaseFetchService,
  ApiService,
  getLogger,
} from '@subql/node-core';
import { DictionaryQueryCondition, DictionaryQueryEntry } from '@subql/types';
import {
  SorobanBlock,
  SorobanEffectFilter,
  SorobanOperationFilter,
  SorobanTransactionFilter,
  SubqlDatasource,
} from '@subql/types-soroban';
import { MetaData } from '@subql/utils';
import { groupBy, sortBy, uniqBy } from 'lodash';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { SorobanApi } from '../soroban';
import { calcInterval } from '../soroban/utils.soroban';
import { yargsOptions } from '../yargs';
import { ISorobanBlockDispatcher } from './blockDispatcher';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import {
  blockToHeader,
  UnfinalizedBlocksService,
} from './unfinalizedBlocks.service';

const logger = getLogger('fetch.service');

const BLOCK_TIME_VARIANCE = 5000;

const INTERVAL_PERCENT = 0.9;

function transactionFilterToQueryEntry(
  filter: SorobanTransactionFilter,
  dsOptions: SubqlSorobanProcessorOptions | SubqlSorobanProcessorOptions[],
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [];

  if (filter.account) {
    conditions.push({
      field: 'account',
      value: filter.account.toLowerCase(),
      matcher: 'equalTo',
    });
  }
  return {
    entity: 'transactions',
    conditions,
  };
}

function operationFilterToQueryEntry(
  filter: SorobanOperationFilter,
  dsOptions: SubqlSorobanProcessorOptions | SubqlSorobanProcessorOptions[],
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [];

  if (filter.type) {
    conditions.push({
      field: 'type',
      value: filter.type.toLowerCase(),
      matcher: 'equalTo',
    });
  }
  if (filter.source_account) {
    conditions.push({
      field: 'sourceAccount',
      value: filter.source_account.toLowerCase(),
      matcher: 'equalTo',
    });
  }
  return {
    entity: 'operations',
    conditions,
  };
}

function effectFilterToQueryEntry(
  filter: SorobanEffectFilter,
  dsOptions: SubqlSorobanProcessorOptions | SubqlSorobanProcessorOptions[],
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [];

  if (filter.type) {
    conditions.push({
      field: 'type',
      value: filter.type.toLowerCase(),
      matcher: 'equalTo',
    });
  }
  if (filter.account) {
    conditions.push({
      field: 'account',
      value: filter.account.toLowerCase(),
      matcher: 'equalTo',
    });
  }
  return {
    entity: 'effects',
    conditions,
  };
}

type GroupedSubqlProjectDs = SubqlDatasource & {
  groupedOptions?: SubqlSorobanProcessorOptions[];
};
export function buildDictionaryQueryEntries(
  dataSources: GroupedSubqlProjectDs[],
  startBlock: number,
): DictionaryQueryEntry[] {
  const queryEntries: DictionaryQueryEntry[] = [];

  // Only run the ds that is equal or less than startBlock
  // sort array from lowest ds.startBlock to highest
  const filteredDs = dataSources
    .filter((ds) => ds.startBlock <= startBlock)
    .sort((a, b) => a.startBlock - b.startBlock);

  for (const ds of filteredDs) {
    for (const handler of ds.mapping.handlers) {
      // No filters, cant use dictionary
      if (!handler.filter) return [];

      switch (handler.kind) {
        case SorobanHandlerKind.Transaction: {
          const filter = handler.filter as SorobanTransactionFilter;
          if (ds.groupedOptions) {
            queryEntries.push(
              transactionFilterToQueryEntry(filter, ds.groupedOptions),
            );
          } else if (filter.account) {
            queryEntries.push(
              transactionFilterToQueryEntry(filter, ds.options),
            );
          } else {
            return [];
          }
          break;
        }
        case SorobanHandlerKind.Operation: {
          const filter = handler.filter as SorobanOperationFilter;
          if (ds.groupedOptions) {
            queryEntries.push(
              operationFilterToQueryEntry(filter, ds.groupedOptions),
            );
          } else if (filter.source_account || filter.type) {
            queryEntries.push(operationFilterToQueryEntry(filter, ds.options));
          } else {
            return [];
          }
          break;
        }
        case SorobanHandlerKind.Effects: {
          const filter = handler.filter as SorobanEffectFilter;
          if (ds.groupedOptions) {
            queryEntries.push(
              effectFilterToQueryEntry(filter, ds.groupedOptions),
            );
          } else if (filter.account || filter.type) {
            queryEntries.push(effectFilterToQueryEntry(filter, ds.options));
          } else {
            return [];
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

@Injectable()
export class FetchService extends BaseFetchService<
  ApiService,
  SubqlDatasource,
  ISorobanBlockDispatcher,
  DictionaryService
> {
  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') project: SubqueryProject,
    @Inject('IBlockDispatcher')
    blockDispatcher: ISorobanBlockDispatcher,
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

  get api(): SorobanApi {
    return this.apiService.unsafeApi;
  }

  buildDictionaryQueryEntries(startBlock: number): DictionaryQueryEntry[] {
    const groupdDynamicDs: GroupedSubqlProjectDs[] = Object.values(
      groupBy(this.templateDynamicDatasouces, (ds) => ds.name),
    ).map((grouped: SubqlProjectDs[]) => {
      const options = grouped.map((ds) => ds.options);
      const ref = grouped[0];

      return {
        ...ref,
        groupedOptions: options,
      };
    });

    // Only run the ds that is equal or less than startBlock
    // sort array from lowest ds.startBlock to highest
    const filteredDs: GroupedSubqlProjectDs[] =
      this.project.dataSources.concat(groupdDynamicDs);

    return buildDictionaryQueryEntries(filteredDs, startBlock);
  }

  protected async getFinalizedHeight(): Promise<number> {
    const sequence = await this.api.getFinalizedBlockHeight();

    const header = blockToHeader(sequence);

    this.unfinalizedBlocksService.registerFinalizedBlock(header);
    return header.blockHeight;
  }

  protected async getBestHeight(): Promise<number> {
    return this.api.getBestBlockHeight();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getChainInterval(): Promise<number> {
    const CHAIN_INTERVAL = calcInterval(this.api) * INTERVAL_PERCENT;

    return Math.min(BLOCK_TIME_VARIANCE, CHAIN_INTERVAL);
  }

  protected async getChainId(): Promise<string> {
    return Promise.resolve(this.api.getChainId().toString());
  }

  /*
  protected getModulos(): number[] {
    const modulos: number[] = [];
    for (const ds of this.project.dataSources) {
      if (isCustomDs(ds)) {
        continue;
      }
      for (const handler of ds.mapping.handlers) {
        if (
          handler.kind === SorobanHandlerKind.Block &&
          handler.filter &&
          handler.filter.modulo
        ) {
          modulos.push(handler.filter.modulo);
        }
      }
    }
    return modulos;
  }
  */

  protected async initBlockDispatcher(): Promise<void> {
    await this.blockDispatcher.init(this.resetForNewDs.bind(this));
  }

  protected async validatateDictionaryMeta(
    metaData: MetaData,
  ): Promise<boolean> {
    return Promise.resolve(
      // When alias is not used
      metaData.genesisHash !== this.api.getGenesisHash() &&
        // Case when an alias is used
        metaData.genesisHash !== this.dictionaryService.chainId,
    );
  }

  protected async preLoopHook(): Promise<void> {
    // Soroban doesn't need to do anything here
    return Promise.resolve();
  }

  protected getModulos(): number[] {
    //block handler not implemented yet
    return [];
  }
}
