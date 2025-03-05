// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  StellarHandlerKind,
  SubqlStellarDataSource,
  StellarTransactionFilter,
  StellarOperationFilter,
  StellarEffectFilter,
  SubqlStellarProcessorOptions,
} from '@subql/common-stellar';
import {
  NodeConfig,
  DictionaryV1,
  getLogger,
  DsProcessorService,
} from '@subql/node-core';
import {
  DictionaryQueryCondition,
  DictionaryQueryEntry,
  DictionaryQueryEntry as DictionaryV1QueryEntry,
} from '@subql/types-core';

import { SorobanEventFilter, SubqlDatasource } from '@subql/types-stellar';
import { sortBy, uniqBy } from 'lodash';
import { SubqueryProject } from '../../../configure/SubqueryProject';
import { yargsOptions } from '../../../yargs';

type GetDsProcessor = DsProcessorService['getDsProcessor'];

const logger = getLogger('DictionaryService');
function transactionFilterToQueryEntry(
  filter: StellarTransactionFilter,
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
    const addresses = dsOptions
      .map((option) => option.address)
      .filter((address): address is string => !!address);

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

/*
  We can bring groupedOptions back once dictionary event options are supported
  And only event filter support options
 */
type GroupedSubqlProjectDs = SubqlDatasource & {
  groupedOptions?: SubqlStellarProcessorOptions[];
};

export function buildDictionaryQueryEntries(
  dataSources: SubqlDatasource[],
): DictionaryV1QueryEntry[] {
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
          if (filter.account) {
            queryEntries.push(transactionFilterToQueryEntry(filter));
          } else {
            return [];
          }
          break;
        }
        case StellarHandlerKind.Operation: {
          const filter = handler.filter as StellarOperationFilter;
          if (filter.sourceAccount || filter.type) {
            queryEntries.push(operationFilterToQueryEntry(filter));
          } else {
            return [];
          }
          break;
        }
        case StellarHandlerKind.Effects: {
          const filter = handler.filter as StellarEffectFilter;
          if (filter.account || filter.type) {
            queryEntries.push(effectFilterToQueryEntry(filter));
          } else {
            return [];
          }
          break;
        }
        // TODO, event is not provided in current dictionary,
        //  https://github.com/subquery/stellar-subql-dictionaries/blob/main/schema.graphql
        case StellarHandlerKind.Event: {
          const filter = handler.filter as SorobanEventFilter;
          if (ds.options?.address || filter.topics) {
            queryEntries.push(eventFilterToQueryEntry(filter, ds.options!));
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

export class StellarDictionaryV1 extends DictionaryV1<SubqlStellarDataSource> {
  constructor(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    private getDsProcessor: GetDsProcessor,
    dictionaryUrl: string,
    chainId?: string,
  ) {
    super(dictionaryUrl, chainId ?? project.network.chainId, nodeConfig);
  }

  static async create(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    getDsProcessor: GetDsProcessor,
    dictionaryUrl: string,
    chainId?: string,
  ): Promise<StellarDictionaryV1> {
    const dictionary = new StellarDictionaryV1(
      project,
      nodeConfig,
      getDsProcessor,
      dictionaryUrl,
      chainId,
    );
    await dictionary.init();
    return dictionary;
  }

  buildDictionaryQueryEntries(
    dataSources: SubqlStellarDataSource[],
  ): DictionaryV1QueryEntry[] {
    return buildDictionaryQueryEntries(dataSources);
  }
}
