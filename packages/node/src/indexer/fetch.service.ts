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
import {
  NodeConfig,
  BaseFetchService,
  ApiService,
  getLogger,
} from '@subql/node-core';
import { DictionaryQueryCondition, DictionaryQueryEntry } from '@subql/types';
import { SubqlDatasource } from '@subql/types-ethereum';
import { MetaData } from '@subql/utils';
import { groupBy, sortBy, uniqBy } from 'lodash';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApi, EthereumApiService } from '../ethereum';
import SafeEthProvider from '../ethereum/safe-api';
import { calcInterval } from '../ethereum/utils.ethereum';
import { eventToTopic, functionToSighash } from '../utils/string';
import { yargsOptions } from '../yargs';
import { IEthereumBlockDispatcher } from './blockDispatcher';
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
  filter: EthereumLogFilter,
  dsOptions: SubqlEthereumProcessorOptions | SubqlEthereumProcessorOptions[],
): DictionaryQueryEntry {
  const queryAddressLimit = yargsOptions.argv['query-address-limit'];

  const conditions: DictionaryQueryCondition[] = [];

  if (Array.isArray(dsOptions)) {
    const addresses = dsOptions.map((option) => option.address).filter(Boolean);

    if (addresses.length > queryAddressLimit) {
      logger.warn(
        `Addresses length: ${addresses} is exceeding limit: ${queryAddressLimit}. Consider increasing this value with the flag --query-address-limit  `,
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
      matcher: 'equalTo',
    });
  }
  if (filter.to) {
    conditions.push({
      field: 'to',
      value: filter.to.toLowerCase(),
      matcher: 'equalTo',
    });
  } else if (filter.to === null) {
    conditions.push({
      field: 'to',
      value: true as any, // TODO update types to allow boolean
      matcher: 'isNull',
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

type GroupedSubqlProjectDs = SubqlDatasource & {
  groupedOptions?: SubqlEthereumProcessorOptions[];
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

@Injectable()
export class FetchService extends BaseFetchService<
  ApiService,
  SubqlDatasource,
  IEthereumBlockDispatcher,
  DictionaryService
> {
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
    return Promise.resolve(
      // When alias is not used
      metaData.genesisHash !== this.api.getGenesisHash() &&
        // Case when an alias is used
        metaData.genesisHash !== this.dictionaryService.chainId,
    );
  }

  protected async preLoopHook(): Promise<void> {
    // Ethereum doesn't need to do anything here
    return Promise.resolve();
  }
}
