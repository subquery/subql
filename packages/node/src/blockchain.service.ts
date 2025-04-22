// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject } from '@nestjs/common';
import {
  EthereumHandlerKind,
  EthereumRuntimeDataSourceImpl,
  isCustomDs,
  isRuntimeDs,
  SubqlEthereumDataSource,
} from '@subql/common-ethereum';
import {
  DatasourceParams,
  Header,
  IBlock,
  IBlockchainService,
} from '@subql/node-core';
import {
  EthereumBlock,
  LightEthereumBlock,
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlDatasource,
  SubqlMapping,
  SubqlRuntimeDatasource,
} from '@subql/types-ethereum';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SubqueryProject } from './configure/SubqueryProject';
import { EthereumApiService } from './ethereum';
import SafeEthProvider from './ethereum/safe-api';
import { calcInterval, ethereumBlockToHeader } from './ethereum/utils.ethereum';
import { BlockContent, getBlockSize } from './indexer/types';
import { IIndexerWorker } from './indexer/worker/worker';

const BLOCK_TIME_VARIANCE = 5000;

const INTERVAL_PERCENT = 0.9;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../package.json');

export class BlockchainService
  implements
    IBlockchainService<
      SubqlDatasource,
      SubqlCustomDatasource<string, SubqlMapping<SubqlCustomHandler>>,
      SubqueryProject,
      SafeEthProvider,
      LightEthereumBlock,
      EthereumBlock,
      IIndexerWorker
    >
{
  blockHandlerKind = EthereumHandlerKind.Block;
  isCustomDs = isCustomDs;
  isRuntimeDs = isRuntimeDs;
  packageVersion = packageVersion;

  constructor(@Inject('APIService') private apiService: EthereumApiService) {}

  async fetchBlocks(
    blockNums: number[],
  ): Promise<IBlock<EthereumBlock>[] | IBlock<LightEthereumBlock>[]> {
    return this.apiService.fetchBlocks(blockNums);
  }

  async fetchBlockWorker(
    worker: IIndexerWorker,
    blockNum: number,
    context: { workers: IIndexerWorker[] },
  ): Promise<Header> {
    return worker.fetchBlock(blockNum, 0);
  }

  getBlockSize(block: IBlock<BlockContent>): number {
    return getBlockSize(block.block);
  }

  async getFinalizedHeader(): Promise<Header> {
    const block = await this.apiService.api.getFinalizedBlock();
    return ethereumBlockToHeader(block);
  }

  async getBestHeight(): Promise<number> {
    return this.apiService.api.getBestBlockHeight();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getChainInterval(): Promise<number> {
    const CHAIN_INTERVAL = calcInterval(this.apiService.api) * INTERVAL_PERCENT;

    return Math.min(BLOCK_TIME_VARIANCE, CHAIN_INTERVAL);
  }

  async getHeaderForHash(hash: string): Promise<Header> {
    const block = await this.apiService.api.getBlockByHeightOrHash(hash);
    return ethereumBlockToHeader(block);
  }

  async getHeaderForHeight(height: number): Promise<Header> {
    const block = await this.apiService.api.getBlockByHeightOrHash(height);
    return ethereumBlockToHeader(block);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSafeApi(block: BlockContent): Promise<SafeEthProvider> {
    return this.apiService.safeApi(block.number);
  }

  async getBlockTimestamp(height: number): Promise<Date> {
    const block = await this.apiService.unsafeApi.api.getBlock(height);

    return new Date(block.timestamp * 1000); // TODO test and make sure its in MS not S
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateDynamicDs(
    params: DatasourceParams,
    dsObj: SubqlEthereumDataSource | SubqlCustomDatasource,
  ): Promise<void> {
    if (isCustomDs(dsObj)) {
      dsObj.processor.options = {
        ...dsObj.processor.options,
        ...params.args,
      };
      // TODO how to retain this functionality
      // await this.dsProcessorService.validateCustomDs([dsObj]);
    } else if (isRuntimeDs(dsObj)) {
      dsObj.options = {
        ...dsObj.options,
        ...params.args,
      };

      const parsedDs = plainToClass(EthereumRuntimeDataSourceImpl, dsObj);

      const errors = validateSync(parsedDs, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      if (errors.length) {
        throw new Error(
          `Dynamic ds is invalid\n${errors
            .map((e) => e.toString())
            .join('\n')}`,
        );
      }
    }
    // return dsObj;
  }

  onProjectChange(project: SubqueryProject): Promise<void> | void {
    this.apiService.updateBlockFetching();
  }
}
