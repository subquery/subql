// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubstrateDataSource } from '@subql/common-substrate';
import {
  NodeConfig,
  DictionaryV2,
  DictionaryResponse,
  getLogger,
  DictionaryV2QueryEntry,
  RawDictionaryResponseData,
  IBlock,
} from '@subql/node-core';
import { SubstrateBlock, SubstrateDatasource } from '@subql/types';
import { SubqueryProject } from '../../../configure/SubqueryProject';
import { SubstrateDictionaryV2QueryEntry } from './types';

const MIN_FAT_FETCH_LIMIT = 200;

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
  ): Promise<DictionaryResponse<IBlock<SubstrateBlock> | number> | undefined> {
    return this.getData(startBlock, queryEndBlock, limit);
  }

  // TODO, complete this once substrate support v2
  convertResponseBlocks(
    result: RawDictionaryResponseData<any>,
  ): DictionaryResponse<IBlock<SubstrateBlock>> | undefined {
    return undefined;
  }
}
