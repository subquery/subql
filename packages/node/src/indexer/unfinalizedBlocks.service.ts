// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { SignedBlock } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { getLogger, MetadataRepo } from '@subql/node-core';
import { Transaction } from 'sequelize';
import { ApiService } from './api.service';
import { BestBlocks } from './types';

const logger = getLogger('bestBlock');

export const METADATA_UNFINALIZED_BLOCKS_KEY = 'unfinalizedBlocks';
export const METADATA_LAST_FINALIZED_PROCESSED_KEY =
  'lastFinalizedVerifiedHeight';

@Injectable()
export class UnfinalizedBlocksService {
  private unfinalizedBlocks: BestBlocks = {};
  private finalizedBlock: SignedBlock;
  private metaDataRepo: MetadataRepo;
  private lastCheckedBlockHeight: number;

  constructor(private apiService: ApiService) {}

  init(
    metadataRepo: MetadataRepo,
    startUnfinalizedBlocks: Record<number, HexString>,
    lastFinalizedVerifiedHeight: number,
  ): void {
    this.unfinalizedBlocks = startUnfinalizedBlocks;
    this.lastCheckedBlockHeight = lastFinalizedVerifiedHeight;
    this.metaDataRepo = metadataRepo;
  }

  private get api(): ApiPromise {
    return this.apiService.getApi();
  }

  unfinalizedBlock(number: number): HexString {
    return this.unfinalizedBlocks[number];
  }

  registerFinalizedBlock(block: SignedBlock): void {
    if (
      this.finalizedBlock &&
      this.finalizedBlock.block.header.number.toNumber() ===
        block.block.header.number.toNumber()
    ) {
      return;
    }
    this.finalizedBlock = block;
  }

  async registerUnfinalizedBlock(
    blockNumber: number,
    hash: HexString,
    tx: Transaction,
  ): Promise<void> {
    if (
      !this.unfinalizedBlocks[blockNumber] &&
      blockNumber > this.finalizedBlock.block.header.number.toNumber()
    ) {
      this.storeUnfinalizedBlock(blockNumber, hash);
    }
    await this.saveUnfinalizedBlocks(this.unfinalizedBlocks, tx);
  }

  async deleteFinalizedBlock(tx: Transaction): Promise<void> {
    if (
      this.lastCheckedBlockHeight !== undefined &&
      this.lastCheckedBlockHeight <
        this.finalizedBlock.block.header.number.toNumber()
    ) {
      this.removeFinalized(this.finalizedBlock.block.header.number.toNumber());
      await this.saveLastFinalizedVerifiedHeight(
        this.finalizedBlock.block.header.number.toNumber(),
        tx,
      );
      await this.saveUnfinalizedBlocks(this.unfinalizedBlocks, tx);
    }
    this.lastCheckedBlockHeight =
      this.finalizedBlock.block.header.number.toNumber();
  }

  storeUnfinalizedBlock(blockNumber: number, hash: HexString): void {
    this.unfinalizedBlocks[blockNumber] = hash;
  }

  private async saveUnfinalizedBlocks(
    unfinalizedBlocks: Record<number, HexString>,
    tx: Transaction,
  ): Promise<void> {
    return this.setMetadata(
      METADATA_UNFINALIZED_BLOCKS_KEY,
      JSON.stringify(unfinalizedBlocks),
      tx,
    );
  }

  private async saveLastFinalizedVerifiedHeight(
    height: number,
    tx: Transaction,
  ) {
    return this.setMetadata(METADATA_LAST_FINALIZED_PROCESSED_KEY, height, tx);
  }

  // remove any records less and equal than input finalized blockHeight
  removeFinalized(blockHeight: number): void {
    Object.entries(this.unfinalizedBlocks).map(([bestBlockHeight, hash]) => {
      if (Number(bestBlockHeight) <= blockHeight) {
        delete this.unfinalizedBlocks[bestBlockHeight];
      }
    });
  }

  // find closest record from block heights
  getClosestRecord(
    blockHeight: number,
  ): { blockHeight: number; hash: HexString } | undefined {
    // Have the block in the best block, can be verified
    if (Object.keys(this.unfinalizedBlocks).length !== 0) {
      const record = Object.entries(this.unfinalizedBlocks)
        .sort(([bestBlockA], [bestBlockB]) => {
          return Number(bestBlockB) - Number(bestBlockA);
        })
        .find(
          ([bestBlockHeight, hash]) => Number(bestBlockHeight) <= blockHeight,
        );
      if (record) {
        const [bestBlockHeight, hash] = record;
        return { blockHeight: Number(bestBlockHeight), hash: hash };
      }
    }
    return undefined;
  }

  // verify best blocks with finalized block
  async validateUnfinalizedBlocks(): Promise<boolean> {
    const finalizedBlockNumber =
      this.finalizedBlock.block.header.number.toNumber();
    const lastVerifiableBlock = this.getClosestRecord(finalizedBlockNumber);
    if (lastVerifiableBlock) {
      if (lastVerifiableBlock.blockHeight === finalizedBlockNumber) {
        if (lastVerifiableBlock.hash !== this.finalizedBlock.hash.toHex()) {
          return false;
        }
      } else {
        // use api to fetch lastVerifiableBlock, see if hash matches
        const actualHash = (
          await this.api.rpc.chain.getBlockHash(lastVerifiableBlock.blockHeight)
        ).toHex();
        if (actualHash !== lastVerifiableBlock.hash) {
          logger.warn(
            `Block fork found, enqueued un-finalized block at ${lastVerifiableBlock.blockHeight} with hash ${lastVerifiableBlock.hash}, actual hash is ${actualHash} `,
          );
          return false;
        }
      }
    }
    return true;
  }

  async getLastCorrectFinalizedBlock(): Promise<number | undefined> {
    const bestVerifiableBlocks = Object.entries(this.unfinalizedBlocks)
      .sort(([bestBlockA], [bestBlockB]) => {
        return Number(bestBlockB) - Number(bestBlockA);
      })
      .filter(
        ([bestBlockHeight, hash]) =>
          Number(bestBlockHeight) <=
          this.finalizedBlock.block.header.number.toNumber(),
      );
    for (const [block, hash] of bestVerifiableBlocks) {
      const actualHash = await this.api.rpc.chain.getBlockHash(block);
      if (hash === actualHash.toHex()) {
        return Number(block);
      }
    }
    return this.lastCheckedBlockHeight;
  }

  async resetUnfinalizedBlocks(tx: Transaction): Promise<void> {
    await this.setMetadata(METADATA_UNFINALIZED_BLOCKS_KEY, '{}', tx);
    this.unfinalizedBlocks = {};
  }

  async resetLastFinalizedVerifiedHeight(tx: Transaction): Promise<void> {
    return this.setMetadata(METADATA_LAST_FINALIZED_PROCESSED_KEY, null, tx);
  }

  private async setMetadata(
    key: string,
    value: string | number | boolean,
    tx: Transaction,
  ): Promise<void> {
    assert(this.metaDataRepo, `Model _metadata does not exist`);
    await this.metaDataRepo.upsert({ key, value }, { transaction: tx });
  }
}
