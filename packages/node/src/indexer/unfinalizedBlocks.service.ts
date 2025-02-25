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
  private supportsFinalization?: boolean;
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
   * @param supportsFinalization - If the chain supports the 'finalized' block tag this should be true.
   * */
  // eslint-disable-next-line @typescript-eslint/require-await
  async init(
    reindex: (targetHeight: Header) => Promise<void>,
    supportsFinalisation?: boolean,
  ): Promise<Header | undefined> {
    this.supportsFinalization = supportsFinalisation;
    return super.init(reindex);
  }
  /**
   * Checks if a fork has happened, this doesn't find the start of the fork just where it was detected
   * @returns (Header | undefined) - The header may be the forked header but will most likely be the main header. Either way it should be used just for the block height
   * */
  @profiler()
  protected async hasForked(): Promise<Header | undefined> {
    if (this.supportsFinalization) {
      return super.hasForked();
    }

    // Startup check helps speed up finding a fork by checking the hash of the last unfinalized block
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
    if (this.supportsFinalization) {
      return super.getLastCorrectFinalizedBlock(forkedHeader);
    }

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
      checkingHeader = await this.blockchainService.getHeaderForHash(
        checkingHeader.parentHash,
      );
    }

    try {
      const poiHeader = await this.findFinalizedUsingPOI(checkingHeader);
      return poiHeader;
    } catch (e: any) {
      if (e.message === POI_NOT_ENABLED_ERROR_MESSAGE) {
        return {
          blockHeight: Math.max(
            0,
            forkedHeader.blockHeight -
              (this.nodeConfig as EthereumNodeConfig).blockForkReindex,
          ),
        } as Header;
      }
      // TODO rewind back 1000+ blocks
      logger.info('Failed to use POI to rewind block');
      throw e;
    }
  }
}
