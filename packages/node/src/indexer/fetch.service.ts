// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';

import {
  isCustomDs,
  EthereumHandlerKind,
  EthereumLogFilter,
  SubqlEthereumProcessorOptions,
  EthereumTransactionFilter,
} from '@subql/common-ethereum';
import { ApiService, NodeConfig, BaseFetchService } from '@subql/node-core';
import { DictionaryQueryCondition, DictionaryQueryEntry } from '@subql/types';
import {
  // DictionaryQueryCondition,
  // DictionaryQueryEntry,
  SubqlDatasource,
} from '@subql/types-ethereum';
import { MetaData } from '@subql/utils';
import { groupBy, sortBy, uniqBy } from 'lodash';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApi } from '../ethereum';
import { calcInterval } from '../ethereum/utils.ethereum';
import { eventToTopic, functionToSighash } from '../utils/string';
import { IEthereumBlockDispatcher } from './blockDispatcher';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import {
  blockToHeader,
  UnfinalizedBlocksService,
} from './unfinalizedBlocks.service';

const BLOCK_TIME_VARIANCE = 5000;

const INTERVAL_PERCENT = 0.9;
const QUERY_ADDRESS_LIMIT = 50;

function eventFilterToQueryEntry(
  filter: EthereumLogFilter,
  dsOptions: SubqlEthereumProcessorOptions | SubqlEthereumProcessorOptions[],
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [];

  if (Array.isArray(dsOptions)) {
    const addresses = dsOptions.map((option) => option.address).filter(Boolean);

    if (addresses.length !== 0 && addresses.length <= QUERY_ADDRESS_LIMIT) {
      conditions.push({
        field: 'address',
        value: addresses,
        matcher: 'inInsensitive',
      });
    }
  } else {
    if (dsOptions?.address) {
      conditions.push({
        field: 'address',
        value: dsOptions.address.toLowerCase(),
        // matcher: 'equals',
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
        value: eventToTopic(topic),
        matcher: 'equalTo',
      });
    }
  }
  return {
    entity: 'evmLogs',
    conditions,
  };
}

function callFilterToQueryEntry(
  filter: EthereumTransactionFilter,
): DictionaryQueryEntry {
  const conditions: DictionaryQueryCondition[] = [];
  if (filter.from) {
    conditions.push({
      field: 'from',
      value: filter.from.toLowerCase(),
    });
  }
  if (filter.to) {
    conditions.push({
      field: 'to',
      value: filter.to.toLowerCase(),
    });
  }
  if (filter.function) {
    conditions.push({
      field: 'func',
      value: functionToSighash(filter.function),
      matcher: 'equalTo',
    });
  }
  return {
    entity: 'evmTransactions',
    conditions,
  };
}

@Injectable()
export class FetchService extends BaseFetchService<
  SubqlDatasource,
  IEthereumBlockDispatcher,
  DictionaryService
> {
  private evmChainId?: string;

  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') project: SubqueryProject,
    @Inject('IBlockDispatcher')
    blockDispatcher: IEthereumBlockDispatcher,
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

  get api(): EthereumApi {
    return this.apiService.api;
  }

  buildDictionaryQueryEntries(startBlock: number): DictionaryQueryEntry[] {
    const queryEntries: DictionaryQueryEntry[] = [];

    type GroupedSubqlProjectDs = SubqlDatasource & {
      groupedOptions?: SubqlEthereumProcessorOptions[];
    };

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
    const filteredDs: GroupedSubqlProjectDs[] = this.project.dataSources
      .concat(groupdDynamicDs)
      .filter((ds) => ds.startBlock <= startBlock)
      .sort((a, b) => a.startBlock - b.startBlock);

    for (const ds of filteredDs) {
      for (const handler of ds.mapping.handlers) {
        // No filters, cant use dictionary
        if (!handler.filter) return [];

        switch (handler.kind) {
          case EthereumHandlerKind.Block:
            return [];
          case EthereumHandlerKind.Call: {
            const filter = handler.filter as EthereumTransactionFilter;
            if (
              filter.from !== undefined ||
              filter.to !== undefined ||
              filter.function
            ) {
              queryEntries.push(callFilterToQueryEntry(filter));
            } else {
              return [];
            }
            break;
          }
          case EthereumHandlerKind.Event: {
            const filter = handler.filter as EthereumLogFilter;
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

  protected async getFinalizedHeight(): Promise<number> {
    const block = await this.api.getFinalizedBlock();

    const header = blockToHeader(block);

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
    const modulos: number[] = [];
    for (const ds of this.project.dataSources) {
      if (isCustomDs(ds)) {
        continue;
      }
      for (const handler of ds.mapping.handlers) {
        if (
          handler.kind === EthereumHandlerKind.Block &&
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

  protected async validatateDictionaryMeta(
    metaData: MetaData,
  ): Promise<boolean> {
    const evmChainId = await this.dictionaryService.getEvmChainId();

    return (
      metaData.genesisHash !== this.api.getGenesisHash() &&
      evmChainId !== this.api.getChainId().toString()
    );
  }

  protected async preLoopHook(): Promise<void> {
    // Ethereum doesn't need to do anything here
    return Promise.resolve();
  }
}
