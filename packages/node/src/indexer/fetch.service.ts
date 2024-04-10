// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';

import {
  StellarHandlerKind,
  SubqlStellarProcessorOptions,
  isCustomDs,
} from '@subql/common-stellar';
import {
  NodeConfig,
  BaseFetchService,
  ApiService,
  getLogger,
  getModulos,
} from '@subql/node-core';
import {
  DictionaryQueryEntry,
  DictionaryQueryCondition,
} from '@subql/types-core';
import {
  SorobanEventFilter,
  StellarEffectFilter,
  StellarOperationFilter,
  StellarTransactionFilter,
  SubqlDatasource,
} from '@subql/types-stellar';
import { groupBy, partition, sortBy, uniqBy } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { StellarApi } from '../stellar';
import { calcInterval } from '../stellar/utils.stellar';
import { yargsOptions } from '../yargs';
import { IStellarBlockDispatcher } from './blockDispatcher';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { ProjectService } from './project.service';
import {
  blockToHeader,
  UnfinalizedBlocksService,
} from './unfinalizedBlocks.service';

const logger = getLogger('fetch.service');

const BLOCK_TIME_VARIANCE = 5000;

const INTERVAL_PERCENT = 0.9;

function transactionFilterToQueryEntry(
  filter: StellarTransactionFilter,
  dsOptions: SubqlStellarProcessorOptions | SubqlStellarProcessorOptions[],
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
  filter: StellarOperationFilter,
  dsOptions: SubqlStellarProcessorOptions | SubqlStellarProcessorOptions[],
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [];

  if (filter.type) {
    conditions.push({
      field: 'type',
      value: filter.type.toLowerCase(),
      matcher: 'equalTo',
    });
  }
  if (filter.sourceAccount) {
    conditions.push({
      field: 'sourceAccount',
      value: filter.sourceAccount.toLowerCase(),
      matcher: 'equalTo',
    });
  }
  return {
    entity: 'operations',
    conditions,
  };
}

function effectFilterToQueryEntry(
  filter: StellarEffectFilter,
  dsOptions: SubqlStellarProcessorOptions | SubqlStellarProcessorOptions[],
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

function eventFilterToQueryEntry(
  filter: SorobanEventFilter,
  dsOptions: SubqlStellarProcessorOptions | SubqlStellarProcessorOptions[],
): DictionaryQueryEntry {
  const queryAddressLimit = yargsOptions.argv['query-address-limit'];

  const conditions: DictionaryQueryCondition[] = [];

  if (Array.isArray(dsOptions)) {
    const addresses = dsOptions.map((option) => option.address).filter(Boolean);

    if (addresses.length > queryAddressLimit) {
      logger.warn(
        `Addresses length: ${addresses.length} is exceeding limit: ${queryAddressLimit}. Consider increasing this value with the flag --query-address-limit  `,
      );
    }

    if (addresses.length !== 0 && addresses.length <= queryAddressLimit) {
      conditions.push({
        field: 'address',
        value: addresses,
        matcher: 'in',
      });
    }
  } else {
    if (dsOptions?.address) {
      conditions.push({
        field: 'address',
        value: dsOptions.address.toLowerCase(),
        matcher: 'equalTo',
      });
    }
  }
  if (filter.topics) {
    for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
      const topic = filter.topics[i];
      if (!topic) {
        continue;
      }
      const field = `topics${i}`;
      conditions.push({
        field,
        value: topic,
        matcher: 'equalTo',
      });
    }
  }
  return {
    entity: 'events',
    conditions,
  };
}

type GroupedSubqlProjectDs = SubqlDatasource & {
  groupedOptions?: SubqlStellarProcessorOptions[];
};
export function buildDictionaryQueryEntries(
  dataSources: GroupedSubqlProjectDs[],
): DictionaryQueryEntry[] {
  const queryEntries: DictionaryQueryEntry[] = [];

  for (const ds of dataSources) {
    for (const handler of ds.mapping.handlers) {
      // No filters, cant use dictionary
      if (!handler.filter) return [];

      switch (handler.kind) {
        case StellarHandlerKind.Block:
          return [];
        case StellarHandlerKind.Transaction: {
          const filter = handler.filter as StellarTransactionFilter;
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
        case StellarHandlerKind.Operation: {
          const filter = handler.filter as StellarOperationFilter;
          if (ds.groupedOptions) {
            queryEntries.push(
              operationFilterToQueryEntry(filter, ds.groupedOptions),
            );
          } else if (filter.sourceAccount || filter.type) {
            queryEntries.push(operationFilterToQueryEntry(filter, ds.options));
          } else {
            return [];
          }
          break;
        }
        case StellarHandlerKind.Effects: {
          const filter = handler.filter as StellarEffectFilter;
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
        case StellarHandlerKind.Event: {
          const filter = handler.filter as SorobanEventFilter;
          if (ds.groupedOptions) {
            queryEntries.push(
              eventFilterToQueryEntry(filter, ds.groupedOptions),
            );
          } else if (ds.options?.address || filter.topics) {
            queryEntries.push(eventFilterToQueryEntry(filter, ds.options));
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
  SubqlDatasource,
  IStellarBlockDispatcher,
  DictionaryService
> {
  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('IProjectService') projectService: ProjectService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    @Inject('IBlockDispatcher')
    blockDispatcher: IStellarBlockDispatcher,
    dictionaryService: DictionaryService,
    private dsProcessorService: DsProcessorService,
    dynamicDsService: DynamicDsService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    eventEmitter: EventEmitter2,
    schedulerRegistry: SchedulerRegistry,
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

  get api(): StellarApi {
    return this.apiService.unsafeApi;
  }

  protected getGenesisHash(): string {
    return this.apiService.networkMeta.genesisHash;
  }

  protected buildDictionaryQueryEntries(
    dataSources: (SubqlDatasource & { name?: string })[],
  ): DictionaryQueryEntry[] {
    const [normalDataSources, templateDataSources] = partition(
      dataSources,
      (ds) => !ds.name,
    );

    // Group templ
    const groupedDataSources = Object.values(
      groupBy(templateDataSources, (ds) => ds.name),
    ).map((grouped) => {
      if (grouped.length === 1) {
        return grouped[0];
      }
      const options = grouped.map((ds) => ds.options);
      const ref = grouped[0];

      return {
        ...ref,
        groupedOptions: options,
      };
    });

    const filteredDs = [...normalDataSources, ...groupedDataSources];

    return buildDictionaryQueryEntries(filteredDs);
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

  protected getModulos(): number[] {
    return getModulos(
      this.projectService.getAllDataSources(),
      isCustomDs,
      StellarHandlerKind.Block,
    );
  }

  protected async initBlockDispatcher(): Promise<void> {
    await this.blockDispatcher.init(this.resetForNewDs.bind(this));
  }

  protected async preLoopHook(): Promise<void> {
    // Stellar doesn't need to do anything here
    return Promise.resolve();
  }
}
