// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { Horizon } from '@stellar/stellar-sdk';
import {
  isCustomDs,
  isRuntimeDs,
  StellarRuntimeDataSourceImpl,
} from '@subql/common-stellar';
import {
  DatasourceParams,
  Header,
  IBlock,
  IBlockchainService,
} from '@subql/node-core';
import {
  StellarBlockWrapper,
  StellarHandlerKind,
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlDatasource,
  SubqlMapping,
} from '@subql/types-stellar';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SubqueryProject } from './configure/SubqueryProject';
import { getBlockSize } from './indexer/types';
import { IIndexerWorker } from './indexer/worker/worker';
import { StellarApiService } from './stellar';
import SafeStellarProvider from './stellar/safe-api';
import { calcInterval, stellarBlockToHeader } from './stellar/utils.stellar';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../package.json');

const BLOCK_TIME_VARIANCE = 5000;
const INTERVAL_PERCENT = 0.9;

@Injectable()
export class BlockchainService
  implements
    IBlockchainService<
      SubqlDatasource,
      SubqlCustomDatasource,
      SubqueryProject,
      SafeStellarProvider,
      StellarBlockWrapper, // Update to light block if thats ever supported
      StellarBlockWrapper,
      IIndexerWorker
    >
{
  blockHandlerKind = StellarHandlerKind.Block;
  isCustomDs = isCustomDs;
  isRuntimeDs = isRuntimeDs;
  packageVersion = packageVersion;

  constructor(@Inject('APIService') private apiService: StellarApiService) {}

  async fetchBlocks(
    blockNums: number[],
  ): Promise<IBlock<StellarBlockWrapper>[]> {
    return this.apiService.fetchBlocks(blockNums);
  }

  async fetchBlockWorker(
    worker: IIndexerWorker,
    blockNum: number,
    context: { workers: IIndexerWorker[] },
  ): Promise<Header> {
    return worker.fetchBlock(blockNum, 0 /* Not used by stellar*/);
  }

  getBlockSize(block: IBlock<StellarBlockWrapper>): number {
    return getBlockSize(block.block);
  }

  async getFinalizedHeader(): Promise<Header> {
    const block = await this.apiService.api.getFinalizedBlock();
    return stellarBlockToHeader(block);
  }

  async getBestHeight(): Promise<number> {
    return this.apiService.api.getBestBlockHeight();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getChainInterval(): Promise<number> {
    const CHAIN_INTERVAL = calcInterval(this.apiService.api) * INTERVAL_PERCENT;

    return Math.min(BLOCK_TIME_VARIANCE, CHAIN_INTERVAL);
  }

  // Stellar has instant finalizaition and no way to get blocks by hash so the headers should use the block height as the hash and parent hash
  async getHeaderForHash(hash: string): Promise<Header> {
    return this.getHeaderForHeight(parseInt(hash, 10));
  }

  async getHeaderForHeight(height: number): Promise<Header> {
    const res = await this.apiService.api.api.ledgers().ledger(height).call();
    return stellarBlockToHeader(res as any);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateDynamicDs(
    params: DatasourceParams,
    dsObj: SubqlDatasource | SubqlCustomDatasource,
  ): Promise<void> {
    if (isCustomDs(dsObj)) {
      dsObj.processor.options = {
        ...dsObj.processor.options,
        ...params.args,
      };
      // await this.dsProcessorService.validateCustomDs([dsObj]);
    } else if (isRuntimeDs(dsObj)) {
      dsObj.options = {
        ...dsObj.options,
        ...params.args,
      };

      const parsedDs = plainToClass(StellarRuntimeDataSourceImpl, dsObj);

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
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSafeApi(block: StellarBlockWrapper): Promise<SafeStellarProvider> {
    return this.apiService.safeApi(block.block.sequence);
  }

  onProjectChange(project: SubqueryProject): void | Promise<void> {
    // TODO update this when implementing skipBlock feature for Stellar
    // this.apiService.updateBlockFetching();
  }

  async getBlockTimestamp(height: number): Promise<Date> {
    const block = await this.apiService.api.api.ledgers().ledger(height).call();

    return new Date(
      (block as unknown as Horizon.ServerApi.LedgerRecord).closed_at,
    );
  }
}
