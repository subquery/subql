// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  UnfinalizedBlocksService as BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  getLogger,
  profiler,
  POI_NOT_ENABLED_ERROR_MESSAGE,
  IStoreModelProvider,
  IBlockchainService,
} from '@subql/node-core';
import { last } from 'lodash';
import { BlockchainService } from '../blockchain.service';
import { EthereumNodeConfig } from '../configure/NodeConfig';
import { BlockContent } from './types';

const logger = getLogger('UnfinalizedBlocksService');

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockContent> {
  private startupCheck = true;

  constructor(
    nodeConfig: NodeConfig,
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
    @Inject('IBlockchainService') blockchainService: BlockchainService,
  ) {
    // blockchain service cast is due to unsolvable typescript generic error, it wokrs on the main sdk but not here
    super(
      new EthereumNodeConfig(nodeConfig),
      storeModelProvider,
      blockchainService as IBlockchainService,
    );
  }

  /**
   * @param reindex - the function to reindex back before a fork
   * */
  // eslint-disable-next-line @typescript-eslint/require-await
  async init(
    reindex: (targetHeight: Header) => Promise<void>,
  ): Promise<Header | undefined> {
    return super.init(reindex);
  }

  /**
   * Checks if a fork has happened during startup by verifying the last unfinalized block hash.
   * Runtime fork detection is handled by node-core's registerUnfinalizedBlock which validates parentHash chain.
   * @returns (Header | undefined) - The header if fork is detected at startup
   * */
  @profiler()
  protected async hasForked(): Promise<Header | undefined> {
    // Startup check verifies the last unfinalized block hash against the chain
    if (this.startupCheck) {
      this.startupCheck = false;
      const lastUnfinalized = last(this.unfinalizedBlocks);
      if (lastUnfinalized) {
        const checkUnfinalized =
          await this.blockchainService.getHeaderForHeight(
            lastUnfinalized.blockHeight,
          );

        if (lastUnfinalized.blockHash !== checkUnfinalized.blockHash) {
          return checkUnfinalized;
        }
      }
    }

    if (this.unfinalizedBlocks.length <= 2) {
      return;
    }

    const i = this.unfinalizedBlocks.length - 1;
    const current = this.unfinalizedBlocks[i];
    const parent = this.unfinalizedBlocks[i - 1];

    // this now won't find fork as such cases has been covered when registerUnfinalizedBlock() is called
    if (current.parentHash !== parent.blockHash) {
      // We've found a fork now we need to find where the fork happened
      logger.warn(
        `Block fork detected at ${current.blockHeight}. Parent hash ${current.parentHash} doesn't match indexed parent ${parent.blockHash}.`,
      );

      return current;
    }

    return;
  }

  /**
   * Finds the height before the fork occurred based on the result of hasForked
   * @return (number | undefined) - The block height to rewind to to remove forked data
   **/
  protected async getLastCorrectFinalizedBlock(
    forkedHeader: Header,
  ): Promise<Header | undefined> {
    const bestVerifiableBlocks = this.unfinalizedBlocks.filter(
      ({ blockHeight }) => blockHeight < forkedHeader.blockHeight,
    );

    let checkingHeader = forkedHeader;

    // Work backwards through the blocks until we find a matching hash
    for (const header of bestVerifiableBlocks.reverse()) {
      if (
        header.blockHash === checkingHeader.blockHash ||
        header.blockHash === checkingHeader.parentHash
      ) {
        return header;
      }

      // Get the new parent
      if (!checkingHeader.parentHash) {
        throw new Error('Unable to get parent hash for header');
      }
      const parentHeight = checkingHeader.blockHeight - 1;
      try {
        checkingHeader = await this.blockchainService.getHeaderForHash(
          checkingHeader.parentHash,
        );
      } catch {
        // Parent block not found on chain (orphaned), fall back to height-based check
        logger.warn(
          `Failed to get block by hash, falling back to height-based check at height ${parentHeight}`,
        );
        checkingHeader = await this.blockchainService.getHeaderForHeight(
          parentHeight,
        );
      }
    }

    try {
      const poiHeader = await this.findFinalizedUsingPOI(checkingHeader);
      return poiHeader;
    } catch (e: any) {
      if (e.message === POI_NOT_ENABLED_ERROR_MESSAGE) {
        return this.blockchainService.getHeaderForHeight(
          Math.max(
            0,
            forkedHeader.blockHeight -
              (this.nodeConfig as EthereumNodeConfig).blockForkReindex,
          ),
        );
      }
      // TODO rewind back 1000+ blocks
      logger.info('Failed to use POI to rewind block');
      throw e;
    }
  }
}
