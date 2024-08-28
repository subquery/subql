// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NOT_NULL_FILTER } from '@subql/common-ethereum';
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
import { groupedDataSources, validAddresses } from '../utils';
import {
  RawEthBlock,
  EthDictionaryV2QueryEntry,
  EthDictionaryTxConditions,
  EthDictionaryLogConditions,
} from './types';
import { rawBlockToEthBlock } from './utils';

const MIN_FETCH_LIMIT = 200;

const logger = getLogger('dictionary-v2');

function applyAddresses(
  addresses?: (string | undefined | null)[],
): string[] | undefined {
  const queryAddressLimit = yargsOptions.argv['query-address-limit'];
  if (
    !addresses ||
    !addresses.length ||
    addresses.length > queryAddressLimit ||
    addresses.filter((v) => !v).length // DONT use find because 'undefined' and 'null' as falsey
  ) {
    return [];
  }

  return validAddresses(addresses).map((a) => a.toLowerCase());
}

function callFilterToDictionaryCondition(
  filter?: EthereumTransactionFilter,
  addresses?: (string | undefined | null)[],
): EthDictionaryTxConditions {
  const txConditions: EthDictionaryTxConditions = {};
  const toArray: (string | null)[] = [];
  const fromArray: string[] = [];
  const funcArray: string[] = [];

  if (filter?.from) {
    fromArray.push(filter.from.toLowerCase());
  }

  const assignTo = (value: string | null | undefined) => {
    if (value === null) {
      toArray.push(null);
    } else if (value !== undefined) {
      toArray.push(value.toLowerCase());
    }
  };

  const optionsAddresses = applyAddresses(addresses);
  if (!optionsAddresses?.length) {
    assignTo(filter?.to);
  } else {
    if (filter?.to || filter?.to === null) {
      logger.warn(
        `TransactionFilter 'to' conflicts with 'address' in data source options, using data source option`,
      );
    }
    optionsAddresses.forEach(assignTo);
  }

  if (filter?.function) {
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
  filter?: EthereumLogFilter,
  addresses?: (string | undefined | null)[],
): EthDictionaryLogConditions {
  const logConditions: EthDictionaryLogConditions = {};
  logConditions.address = applyAddresses(addresses);
  if (filter?.topics) {
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
      if (topic === NOT_NULL_FILTER) {
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
  dataSources: EthereumProjectDs[],
): EthDictionaryV2QueryEntry {
  const dictionaryConditions: EthDictionaryV2QueryEntry = {
    logs: [],
    transactions: [],
  };

  const groupedHandlers = groupedDataSources(dataSources);
  for (const [handler, addresses] of groupedHandlers) {
    // No filters, cant use dictionary
    if (!handler.filter && !addresses?.length) return {};

    switch (handler.kind) {
      case EthereumHandlerKind.Block:
        if (handler.filter?.modulo === undefined) {
          return {};
        }
        break;
      case EthereumHandlerKind.Call: {
        if (
          (handler.filter &&
            Object.values(handler.filter).filter((v) => v !== undefined)
              .length) ||
          validAddresses(addresses).length
        ) {
          dictionaryConditions.transactions ??= [];
          dictionaryConditions.transactions.push(
            callFilterToDictionaryCondition(handler.filter, addresses),
          );
        }
        break;
      }
      case EthereumHandlerKind.Event: {
        if (
          handler.filter?.topics?.length ||
          validAddresses(addresses).length
        ) {
          dictionaryConditions.logs ??= [];
          dictionaryConditions.logs.push(
            eventFilterToDictionaryCondition(handler.filter, addresses),
          );
        }

        break;
      }
      default:
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
    return buildDictionaryV2QueryEntry(dataSources);
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
        return {
          batchBlocks: [],
          lastBufferedHeight: undefined, // This will get set to the request end block in the base class.
        } as any;
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
