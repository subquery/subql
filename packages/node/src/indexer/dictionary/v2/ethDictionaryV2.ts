// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  NodeConfig,
  DictionaryV2,
  RawDictionaryResponseData,
  DictionaryResponse,
  getLogger,
  IBlock,
} from '@subql/node-core';
import {
  EthereumBlock,
  EthereumHandlerKind,
  EthereumLogFilter,
  EthereumTransactionFilter,
  SubqlDatasource,
  SubqlEthereumProcessorOptions,
} from '@subql/types-ethereum';
import { uniqBy } from 'lodash';
import { EthereumNodeConfig } from '../../../configure/NodeConfig';
import {
  EthereumProjectDs,
  EthereumProjectDsTemplate,
  SubqueryProject,
} from '../../../configure/SubqueryProject';
import { EthereumApi } from '../../../ethereum';
import { eventToTopic, functionToSighash } from '../../../utils/string';
import { yargsOptions } from '../../../yargs';
import { ethFilterDs } from '../utils';
import { GroupedEthereumProjectDs } from '../v1';
import {
  RawEthBlock,
  EthDictionaryV2QueryEntry,
  EthDictionaryTxConditions,
  EthDictionaryLogConditions,
} from './types';
import { rawBlockToEthBlock } from './utils';

const MIN_FETCH_LIMIT = 200;

const logger = getLogger('dictionary-v2');

function extractOptionAddresses(
  dsOptions?: SubqlEthereumProcessorOptions | SubqlEthereumProcessorOptions[],
): string[] {
  const queryAddressLimit = yargsOptions.argv['query-address-limit'];
  const addressArray: string[] = [];
  if (Array.isArray(dsOptions)) {
    const addresses = dsOptions
      .map((option) => option.address)
      .filter((address): address is string => Boolean(address));

    if (addresses.length > queryAddressLimit) {
      logger.debug(
        `Addresses length: ${addresses.length} is exceeding limit: ${queryAddressLimit}. Consider increasing this value with the flag --query-address-limit  `,
      );
    }
    if (addresses.length !== 0 && addresses.length <= queryAddressLimit) {
      addressArray.push(...addresses);
    }
  } else {
    if (dsOptions?.address) {
      addressArray.push(dsOptions.address.toLowerCase());
    }
  }
  return addressArray;
}

function callFilterToDictionaryCondition(
  filter: EthereumTransactionFilter,
  dsOptions?: SubqlEthereumProcessorOptions,
): EthDictionaryTxConditions {
  const txConditions: EthDictionaryTxConditions = {};
  const toArray: (string | null)[] = [];
  const fromArray: string[] = [];
  const funcArray: string[] = [];

  if (filter.from) {
    fromArray.push(filter.from.toLowerCase());
  }

  const assignTo = (value: string | null | undefined) => {
    if (value === null) {
      toArray.push(null);
    } else if (value !== undefined) {
      toArray.push(value.toLowerCase());
    }
  };

  const optionsAddresses = extractOptionAddresses(dsOptions);
  if (!optionsAddresses.length) {
    assignTo(filter.to);
  } else {
    if (filter.to || filter.to === null) {
      logger.warn(
        `TransactionFilter 'to' conflicts with 'address' in data source options, using data source option`,
      );
    }
    optionsAddresses.forEach(assignTo);
  }

  if (filter.function) {
    funcArray.push(functionToSighash(filter.function));
  }

  if (toArray.length !== 0) {
    txConditions.to = toArray;
  }
  if (fromArray.length !== 0) {
    txConditions.from = fromArray;
  }

  if (funcArray.length !== 0) {
    txConditions.data = funcArray;
  }

  return txConditions;
}

function eventFilterToDictionaryCondition(
  filter: EthereumLogFilter,
  dsOptions?: SubqlEthereumProcessorOptions | SubqlEthereumProcessorOptions[],
): EthDictionaryLogConditions {
  const logConditions: EthDictionaryLogConditions = {};
  logConditions.address = extractOptionAddresses(dsOptions);
  if (filter.topics) {
    for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
      const topic = filter.topics[i];
      if (!topic) {
        continue;
      }
      const field = `topics${i}`;
      // Initialized
      if (!logConditions[field]) {
        logConditions[field] = [];
      }
      if (topic === '!null') {
        logConditions[field] = []; // TODO, check if !null
      } else {
        logConditions[field].push(eventToTopic(topic));
      }
    }
  }
  return logConditions;
}

function sanitiseDictionaryConditions(
  dictionaryConditions: EthDictionaryV2QueryEntry,
): EthDictionaryV2QueryEntry {
  if (!dictionaryConditions.logs?.length) {
    delete dictionaryConditions.logs;
  } else {
    dictionaryConditions.logs = uniqBy(dictionaryConditions.logs, (log) =>
      JSON.stringify(log),
    );
  }

  if (!dictionaryConditions.transactions?.length) {
    delete dictionaryConditions.transactions;
  } else {
    dictionaryConditions.transactions = uniqBy(
      dictionaryConditions.transactions,
      (tx) => JSON.stringify(tx),
    );
  }

  return dictionaryConditions;
}

export function buildDictionaryV2QueryEntry(
  dataSources: GroupedEthereumProjectDs[],
): EthDictionaryV2QueryEntry {
  const dictionaryConditions: EthDictionaryV2QueryEntry = {
    logs: [],
    transactions: [],
  };

  for (const ds of dataSources) {
    for (const handler of ds.mapping.handlers) {
      // No filters, cant use dictionary
      if (!handler.filter) return {};

      switch (handler.kind) {
        case EthereumHandlerKind.Block:
          if (handler.filter.modulo === undefined) {
            return {};
          }
          break;
        case EthereumHandlerKind.Call: {
          const filter = handler.filter as EthereumTransactionFilter;
          if (
            filter.from !== undefined ||
            filter.to !== undefined ||
            filter.function !== undefined
          ) {
            dictionaryConditions.transactions ??= [];
            dictionaryConditions.transactions.push(
              callFilterToDictionaryCondition(filter, ds.options),
            );
          } else {
            // do nothing;
          }
          break;
        }
        case EthereumHandlerKind.Event: {
          const filter = handler.filter as EthereumLogFilter;
          dictionaryConditions.logs ??= [];
          if (ds.groupedOptions) {
            dictionaryConditions.logs.push(
              eventFilterToDictionaryCondition(filter, ds.groupedOptions),
            );
          } else if (ds.options?.address || filter.topics) {
            dictionaryConditions.logs.push(
              eventFilterToDictionaryCondition(filter, ds.options),
            );
          } else {
            // do nothing;
          }
          break;
        }
        default:
      }
    }
  }

  return sanitiseDictionaryConditions(dictionaryConditions);
}

export class EthDictionaryV2 extends DictionaryV2<
  EthereumBlock,
  SubqlDatasource,
  EthDictionaryV2QueryEntry
> {
  #skipTransactions: boolean;

  constructor(
    endpoint: string,
    nodeConfig: NodeConfig,
    project: SubqueryProject,
    private api: EthereumApi,
  ) {
    super(endpoint, project.network.chainId, nodeConfig);
    this.#skipTransactions = !!new EthereumNodeConfig(nodeConfig)
      .skipTransactions;
  }

  static async create(
    endpoint: string,
    nodeConfig: NodeConfig,
    project: SubqueryProject,
    api: EthereumApi,
  ): Promise<EthDictionaryV2> {
    const dictionary = new EthDictionaryV2(endpoint, nodeConfig, project, api);
    await dictionary.init();
    return dictionary;
  }

  buildDictionaryQueryEntries(
    dataSources: (EthereumProjectDs | EthereumProjectDsTemplate)[],
  ): EthDictionaryV2QueryEntry {
    const filteredDs = ethFilterDs(dataSources);
    return buildDictionaryV2QueryEntry(filteredDs);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getData(
    startBlock: number,
    endBlock: number,
    limit: number = MIN_FETCH_LIMIT,
  ): Promise<DictionaryResponse<IBlock<EthereumBlock> | number> | undefined> {
    return super.getData(startBlock, endBlock, limit, {
      blockHeader: true,
      logs: { transaction: !this.#skipTransactions },
      transactions: { log: true },
    });
  }

  convertResponseBlocks<RFB = RawEthBlock>(
    data: RawDictionaryResponseData<RFB>,
  ): DictionaryResponse<IBlock<EthereumBlock>> | undefined {
    try {
      const blocks: IBlock<EthereumBlock>[] = (
        (data.blocks as RawEthBlock[]) || []
      ).map((b) => rawBlockToEthBlock(b, this.api));

      if (!blocks.length) {
        return undefined;
      }
      return {
        batchBlocks: blocks,
        lastBufferedHeight: blocks[blocks.length - 1].block.number,
      };
    } catch (e: any) {
      logger.error(e, `Failed to handle block response}`);
      throw e;
    }
  }
}
