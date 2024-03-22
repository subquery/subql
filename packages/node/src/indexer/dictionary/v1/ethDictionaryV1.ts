// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NodeConfig, DictionaryV1, getLogger } from '@subql/node-core';
import {
  DictionaryQueryCondition,
  DictionaryQueryEntry as DictionaryV1QueryEntry,
} from '@subql/types-core';
import {
  EthereumHandlerKind,
  EthereumLogFilter,
  EthereumTransactionFilter,
  SubqlDatasource,
  SubqlEthereumProcessorOptions,
} from '@subql/types-ethereum';
import JSON5 from 'json5';
import { sortBy, uniqBy } from 'lodash';
import fetch from 'node-fetch';
import {
  EthereumProjectDs,
  EthereumProjectDsTemplate,
  SubqueryProject,
} from '../../../configure/SubqueryProject';
import { eventToTopic, functionToSighash } from '../../../utils/string';
import { yargsOptions } from '../../../yargs';
import { ethFilterDs } from '../utils';

const CHAIN_ALIASES_URL =
  'https://raw.githubusercontent.com/subquery/templates/main/chainAliases.json5';

const logger = getLogger('eth-dictionary v1');

export function appendDsOptions(
  dsOptions: SubqlEthereumProcessorOptions | SubqlEthereumProcessorOptions[],
  conditions: DictionaryQueryCondition[],
): void {
  const queryAddressLimit = yargsOptions.argv['query-address-limit'];
  if (Array.isArray(dsOptions)) {
    const addresses = dsOptions.map((option) => option.address).filter(Boolean);

    if (addresses.length > queryAddressLimit) {
      logger.debug(
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
}

function eventFilterToQueryEntry(
  filter: EthereumLogFilter,
  dsOptions: SubqlEthereumProcessorOptions | SubqlEthereumProcessorOptions[],
): DictionaryV1QueryEntry {
  const conditions: DictionaryQueryCondition[] = [];
  appendDsOptions(dsOptions, conditions);
  if (filter.topics) {
    for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
      const topic = filter.topics[i];
      if (!topic) {
        continue;
      }
      const field = `topics${i}`;

      if (topic === '!null') {
        conditions.push({
          field,
          value: false as any, // TODO update types to allow boolean
          matcher: 'isNull',
        });
      } else {
        conditions.push({
          field,
          value: eventToTopic(topic),
          matcher: 'equalTo',
        });
      }
    }
  }
  return {
    entity: 'evmLogs',
    conditions,
  };
}

function callFilterToQueryEntry(
  filter: EthereumTransactionFilter,
  dsOptions: SubqlEthereumProcessorOptions | SubqlEthereumProcessorOptions[],
): DictionaryV1QueryEntry {
  const conditions: DictionaryQueryCondition[] = [];
  appendDsOptions(dsOptions, conditions);

  for (const condition of conditions) {
    if (condition.field === 'address') {
      condition.field = 'to';
    }
  }
  if (filter.from) {
    conditions.push({
      field: 'from',
      value: filter.from.toLowerCase(),
      matcher: 'equalTo',
    });
  }
  const optionsAddresses = conditions.find((c) => c.field === 'to');
  if (!optionsAddresses) {
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
  } else if (optionsAddresses && (filter.to || filter.to === null)) {
    logger.warn(
      `TransactionFilter 'to' conflict with 'address' in data source options`,
    );
  }

  if (filter.function === null || filter.function === '0x') {
    conditions.push({
      field: 'func',
      value: true,
      matcher: 'isNull',
    });
  } else if (filter.function) {
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

export type GroupedEthereumProjectDs = SubqlDatasource & {
  groupedOptions?: SubqlEthereumProcessorOptions[];
};

export function buildDictionaryV1QueryEntries(
  dataSources: GroupedEthereumProjectDs[],
): DictionaryV1QueryEntry[] {
  const queryEntries: DictionaryV1QueryEntry[] = [];

  for (const ds of dataSources) {
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
            filter.function !== undefined
          ) {
            queryEntries.push(callFilterToQueryEntry(filter, ds.options));
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

export class EthDictionaryV1 extends DictionaryV1<GroupedEthereumProjectDs> {
  private constructor(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    dictionaryUrl: string,
    chainId?: string,
  ) {
    super(dictionaryUrl, chainId ?? project.network.chainId, nodeConfig);
  }

  static async create(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    dictionaryUrl?: string,
  ): Promise<EthDictionaryV1> {
    /*Some dictionarys for EVM are built with other SDKs as they are chains with an EVM runtime
     * we maintain a list of aliases so we can map the evmChainId to the genesis hash of the other SDKs
     * e.g moonbeam is built with Substrate SDK but can be used as an EVM dictionary
     */
    const chainAliases = await this.getEvmChainId();
    const chainAlias = chainAliases[project.network.chainId];

    const dictionary = new EthDictionaryV1(
      project,
      nodeConfig,
      dictionaryUrl,
      chainAlias,
    );
    await dictionary.init();
    return dictionary;
  }

  private static async getEvmChainId(): Promise<Record<string, string>> {
    const response = await fetch(CHAIN_ALIASES_URL);

    const raw = await response.text();
    // We use JSON5 here because the file has comments in it
    return JSON5.parse(raw);
  }

  buildDictionaryQueryEntries(
    // Add name to datasource as templates have this set
    dataSources: (EthereumProjectDs | EthereumProjectDsTemplate)[],
  ): DictionaryV1QueryEntry[] {
    const filteredDs = ethFilterDs(dataSources);
    return buildDictionaryV1QueryEntries(filteredDs);
  }
}
