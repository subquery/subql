// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubstrateDataSource } from '@subql/common-substrate';
import {
  NodeConfig,
  FatDictionaryResponse,
  DictionaryV2,
  RawFatDictionaryResponseData,
  DictionaryResponse,
  getLogger,
  DictionaryV2QueryEntry,
} from '@subql/node-core';
import {
  SubstrateBlock,
  SubstrateCallFilter,
  SubstrateDatasource,
  SubstrateHandlerKind,
} from '@subql/types';
import { IBlock } from '@subql/types-core';
import { SubqueryProject } from '../../../configure/SubqueryProject';
import { SubstrateDictionaryV2QueryEntry } from './types';

const MIN_FAT_FETCH_LIMIT = 200;
const FAT_BLOCKS_QUERY_METHOD = `subql_filterBlocks`;

const logger = getLogger('eth-dictionary v2');

export function buildDictionaryV2QueryEntry(
  dataSources: SubstrateDataSource[],
): SubstrateDictionaryV2QueryEntry {
  const fatDictionaryConditions: SubstrateDictionaryV2QueryEntry = {
    logs: [],
    transactions: [],
  };
  //TODO
  return fatDictionaryConditions;
}

export class SubstrateDictionaryV2 extends DictionaryV2<
  SubstrateBlock,
  SubstrateDatasource,
  undefined,
  SubstrateDictionaryV2QueryEntry
> {
  protected buildDictionaryQueryEntries(
    dataSources: SubstrateDataSource[],
  ): DictionaryV2QueryEntry {
    return buildDictionaryV2QueryEntry(dataSources);
  }

  constructor(
    endpoint: string,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    project: SubqueryProject,
    chainId?: string,
  ) {
    super(
      endpoint,
      chainId ?? project.network.chainId,
      nodeConfig,
      eventEmitter,
    );
  }

  /**
   *
   * @param startBlock
   * @param queryEndBlock this block number will limit the max query range, increase dictionary query speed
   * @param batchSize
   * @param conditions
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getData(
    startBlock: number,
    queryEndBlock: number,
    limit = MIN_FAT_FETCH_LIMIT,
  ): Promise<DictionaryResponse<IBlock<SubstrateBlock>> | undefined> {
    const queryDetails = this.queriesMap?.getDetails(startBlock);
    const conditions = queryDetails?.value;
    // TODO

    if (!conditions) {
      return undefined;
    }
  }
}
