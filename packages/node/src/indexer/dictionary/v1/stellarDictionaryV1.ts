// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  StellarHandlerKind,
  SubqlStellarDataSource,
  StellarTransactionFilter,
  StellarOperationFilter,
  StellarEffectFilter,
  SubqlStellarProcessorOptions,
} from '@subql/common-stellar';
import { NodeConfig, DictionaryV1, getLogger } from '@subql/node-core';
import {
  DictionaryQueryCondition,
  DictionaryQueryEntry,
  DictionaryQueryEntry as DictionaryV1QueryEntry,
  DsProcessor,
} from '@subql/types-core';

import { SorobanEventFilter, SubqlDatasource } from '@subql/types-stellar';
import { groupBy, partition, sortBy, uniqBy } from 'lodash';
import { SubqueryProject } from '../../../configure/SubqueryProject';
import { yargsOptions } from '../../../yargs';

const logger = getLogger('dictionary v1');
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

function buildDictionaryV1QueryEntries(
  dataSources: (SubqlDatasource & { name?: string })[],
): DictionaryV1QueryEntry[] {
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

export function buildDictionaryQueryEntries(
  dataSources: GroupedSubqlProjectDs[],
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

export class StellarDictionaryV1 extends DictionaryV1<SubqlStellarDataSource> {
  constructor(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    protected getDsProcessor: (
      ds: SubqlStellarDataSource,
    ) => DsProcessor<SubqlStellarDataSource>,
    dictionaryUrl?: string,
    chainId?: string,
  ) {
    super(dictionaryUrl, chainId ?? project.network.chainId, nodeConfig);
  }

  static async create(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    getDsProcessor: (
      ds: SubqlStellarDataSource,
    ) => DsProcessor<SubqlStellarDataSource>,
    dictionaryUrl?: string,
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
    return buildDictionaryV1QueryEntries(dataSources);
  }
}
