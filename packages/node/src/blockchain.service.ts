// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { isCustomDs, isRuntimeDs } from '@subql/common-substrate';
import {
  DatasourceParams,
  Header,
  IBlock,
  IBlockchainService,
  mainThreadOnly,
} from '@subql/node-core';
import {
  SubstrateCustomDatasource,
  SubstrateCustomHandler,
  SubstrateDatasource,
  SubstrateHandlerKind,
  SubstrateMapping,
} from '@subql/types';
import {
  SubqueryProject,
  SubstrateProjectDs,
} from './configure/SubqueryProject';
import { ApiService } from './indexer/api.service';
import { RuntimeService } from './indexer/runtime/runtimeService';
import {
  ApiAt,
  BlockContent,
  isFullBlock,
  LightBlockContent,
} from './indexer/types';
import { IIndexerWorker } from './indexer/worker/worker';
import {
  calcInterval,
  getBlockByHeight,
  getTimestamp,
  substrateHeaderToHeader,
} from './utils/substrate';

const BLOCK_TIME_VARIANCE = 5000; //ms
const INTERVAL_PERCENT = 0.9;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../package.json');

@Injectable()
export class BlockchainService
  implements
    IBlockchainService<
      SubstrateDatasource,
      SubstrateCustomDatasource<
        string,
        SubstrateMapping<SubstrateCustomHandler>
      >,
      SubqueryProject,
      ApiAt,
      LightBlockContent,
      BlockContent,
      IIndexerWorker
    >
{
  constructor(
    @Inject('APIService') private apiService: ApiService,
    @Inject('RuntimeService') private runtimeService: RuntimeService,
  ) {}

  isCustomDs = isCustomDs;
  isRuntimeDs = isRuntimeDs;
  blockHandlerKind = SubstrateHandlerKind.Block;
  packageVersion = packageVersion;

  @mainThreadOnly()
  async fetchBlocks(
    blockNums: number[],
  ): Promise<IBlock<BlockContent>[] | IBlock<LightBlockContent>[]> {
    const specChanged = await this.runtimeService.specChanged(
      blockNums[blockNums.length - 1],
    );

    // If specVersion not changed, a known overallSpecVer will be pass in
    // Otherwise use api to fetch runtimes
    return this.apiService.fetchBlocks(
      blockNums,
      specChanged ? undefined : this.runtimeService.parentSpecVersion,
    );
  }

  async fetchBlockWorker(
    worker: IIndexerWorker,
    height: number,
    context: { workers: IIndexerWorker[] },
  ): Promise<void> {
    // get SpecVersion from main runtime service
    const { blockSpecVersion, syncedDictionary } =
      await this.runtimeService.getSpecVersion(height);

    // if main runtime specVersion has been updated, then sync with all workers specVersion map, and lastFinalizedBlock
    if (syncedDictionary) {
      context.workers.map((w) =>
        w.syncRuntimeService(
          this.runtimeService.specVersionMap,
          this.runtimeService.latestFinalizedHeight,
        ),
      );
    }

    // const start = new Date();
    await worker.fetchBlock(height, blockSpecVersion);
  }

  async onProjectChange(project: SubqueryProject): Promise<void> {
    // Only network with chainTypes require to reload
    await this.apiService.updateChainTypes();
    this.apiService.updateBlockFetching();
  }

  async getBlockTimestamp(height: number): Promise<Date | undefined> {
    const block = await getBlockByHeight(this.apiService.api, height);
    return getTimestamp(block);
  }

  async getFinalizedHeader(): Promise<Header> {
    const finalizedHash =
      await this.apiService.unsafeApi.rpc.chain.getFinalizedHead();
    const finalizedHeader = await this.apiService.unsafeApi.rpc.chain.getHeader(
      finalizedHash,
    );
    return substrateHeaderToHeader(finalizedHeader);
  }

  async getBestHeight(): Promise<number> {
    const bestHeader = await this.apiService.unsafeApi.rpc.chain.getHeader();
    return bestHeader.number.toNumber();
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async getChainInterval(): Promise<number> {
    const chainInterval = calcInterval(this.apiService.unsafeApi)
      .muln(INTERVAL_PERCENT)
      .toNumber();

    return Math.min(BLOCK_TIME_VARIANCE, chainInterval);
  }

  // TODO can this decorator be in unfinalizedBlocks Service?
  @mainThreadOnly()
  async getHeaderForHash(hash: string): Promise<Header> {
    return substrateHeaderToHeader(
      await this.apiService.unsafeApi.rpc.chain.getHeader(hash),
    );
  }

  // TODO can this decorator be in unfinalizedBlocks Service?
  @mainThreadOnly()
  async getHeaderForHeight(height: number): Promise<Header> {
    const hash = await this.apiService.unsafeApi.rpc.chain.getBlockHash(height);
    return this.getHeaderForHash(hash.toHex());
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateDynamicDs(
    params: DatasourceParams,
    dsObj: SubstrateProjectDs,
  ): Promise<void> {
    if (isCustomDs(dsObj)) {
      dsObj.processor.options = {
        ...dsObj.processor.options,
        ...params.args,
      };
      // TODO needs dsProcessorService
      // await this.dsProcessorService.validateCustomDs([dsObj]);
    } else if (isRuntimeDs(dsObj)) {
      // XXX add any modifications to the ds here
    }
  }

  async getSafeApi(block: LightBlockContent | BlockContent): Promise<ApiAt> {
    const runtimeVersion = !isFullBlock(block)
      ? undefined
      : await this.runtimeService.getRuntimeVersion(block.block);

    return this.apiService.getPatchedApi(
      block.block.block.header,
      runtimeVersion,
    );
  }
}
