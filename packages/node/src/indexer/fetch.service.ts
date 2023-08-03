// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';

import {
  SorobanHandlerKind,
  SorobanEventFilter,
  SubqlSorobanProcessorOptions,
} from '@subql/common-soroban';
import {
  NodeConfig,
  BaseFetchService,
  ApiService,
  getLogger,
} from '@subql/node-core';
import { DictionaryQueryCondition, DictionaryQueryEntry } from '@subql/types';
import { SorobanBlock, SubqlDatasource } from '@subql/types-soroban';
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

function eventFilterToQueryEntry(
  filter: SorobanEventFilter,
  dsOptions: SubqlSorobanProcessorOptions | SubqlSorobanProcessorOptions[],
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
        case SorobanHandlerKind.Event: {
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
