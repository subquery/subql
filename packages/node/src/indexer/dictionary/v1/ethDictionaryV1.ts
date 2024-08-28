// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NOT_NULL_FILTER } from '@subql/common-ethereum';
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
import { groupedDataSources, validAddresses } from '../utils';

const CHAIN_ALIASES_URL =
  'https://raw.githubusercontent.com/subquery/templates/main/chainAliases.json5';

const logger = getLogger('dictionary-v1');

// Adds the addresses to the query conditions if valid
function applyAddresses(
  conditions: DictionaryQueryCondition[],
  addresses?: (string | undefined | null)[],
): void {
  // Don't do anything if theres something that requires no filters
  const queryAddressLimit = yargsOptions.argv['query-address-limit'];
  if (
    !addresses ||
    !addresses.length ||
    addresses.length > queryAddressLimit ||
    addresses.filter((v) => !v).length // DONT use find because 'undefined' and 'null' as falsey
  ) {
    return;
  }

  const filterAddresses = validAddresses(addresses).map((a) => a.toLowerCase());

  if (addresses.length === 1) {
    conditions.push({
      field: 'address',
      value: filterAddresses[0],
      matcher: 'equalTo',
    });
  } else {
    conditions.push({
      field: 'address',
      value: filterAddresses,
      matcher: 'in',
    });
  }
}

function eventFilterToQueryEntry(
  filter?: EthereumLogFilter,
  addresses?: (string | undefined | null)[],
): DictionaryV1QueryEntry {
  const conditions: DictionaryQueryCondition[] = [];
  applyAddresses(conditions, addresses);
  if (filter?.topics) {
    for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
      const topic = filter.topics[i];
      if (!topic) {
        continue;
      }
      const field = `topics${i}`;

      if (topic === NOT_NULL_FILTER) {
        conditions.push({
          field,
          value: false,
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
  filter?: EthereumTransactionFilter,
  addresses?: (string | undefined | null)[],
): DictionaryV1QueryEntry {
  const conditions: DictionaryQueryCondition[] = [];
  applyAddresses(conditions, addresses);

  for (const condition of conditions) {
    if (condition.field === 'address') {
      condition.field = 'to';
    }
  }

  if (!filter) {
    return {
      entity: 'evmTransactions',
      conditions,
    };
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

// eslint-disable-next-line complexity
export function buildDictionaryV1QueryEntries(
  dataSources: SubqlDatasource[],
): DictionaryV1QueryEntry[] {
  const queryEntries: DictionaryV1QueryEntry[] = [];

  const groupedHandlers = groupedDataSources(dataSources);
  for (const [handler, addresses] of groupedHandlers) {
    // No filters, cant use dictionary
    if (!handler.filter && !addresses?.length) return [];

    switch (handler.kind) {
      case EthereumHandlerKind.Block:
        if (handler.filter?.modulo === undefined) {
          return [];
        }
        break;
      case EthereumHandlerKind.Call: {
        if (
          (!handler.filter ||
            !Object.values(handler.filter).filter((v) => v !== undefined)
              .length) &&
          !validAddresses(addresses).length
        ) {
          return [];
        }
        queryEntries.push(callFilterToQueryEntry(handler.filter, addresses));
        break;
      }
      case EthereumHandlerKind.Event:
        if (
          !handler.filter?.topics?.length &&
          !validAddresses(addresses).length
        ) {
          return [];
        }
        queryEntries.push(eventFilterToQueryEntry(handler.filter, addresses));
        break;
      default:
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

export class EthDictionaryV1 extends DictionaryV1<SubqlDatasource> {
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
    dictionaryUrl: string,
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
    return buildDictionaryV1QueryEntries(dataSources);
  }
}
