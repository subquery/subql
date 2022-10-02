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

const logger = getLogger('bestBlock');

const METADATA_BESTBLOCKS_KEY = 'bestBlocks';
const METADATA_LAST_FINALIZED_PROCESSED_KEY = 'lastFinalizedVerifiedHeight';

@Injectable()
export class BestBlockService {
  private bestBlocks: Record<number, HexString>;
  private finalizedBlock: SignedBlock;
  private metaDataRepo: MetadataRepo;
  private lastCheckedBlockHeight: number;

  constructor(private apiService: ApiService) {}

  init(metadataRepo, startBestBlocks, lastFinalizedVerifiedHeight) {
    this.bestBlocks = startBestBlocks;
    this.lastCheckedBlockHeight = lastFinalizedVerifiedHeight;
    this.metaDataRepo = metadataRepo;
  }

  get api(): ApiPromise {
    return this.apiService.getApi();
  }

  bestBlock(number): HexString {
    return this.bestBlocks[number];
  }

  resetBestBlocks() {
    this.bestBlocks = {};
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

  async registerBestBlock(
    blockNumber: number,
    hash: HexString,
    tx: Transaction,
  ): Promise<void> {
    if (
      !this.bestBlocks[blockNumber] &&
      blockNumber > this.finalizedBlock.block.header.number.toNumber()
    ) {
      this.storeBestBlock(blockNumber, hash);
    }
    await this.saveBestBlocks(this.bestBlocks, tx);
  }

  async deleteFinalizedBlock(tx) {
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
      await this.saveBestBlocks(this.bestBlocks, tx);
    }
    this.lastCheckedBlockHeight =
      this.finalizedBlock.block.header.number.toNumber();
  }

  storeBestBlock(blockNumber: number, hash: HexString) {
    this.bestBlocks[blockNumber] = hash;
  }
  private async saveBestBlocks(
    bestBlocks: Record<number, HexString>,
    tx: Transaction,
  ): Promise<void> {
    assert(this.metaDataRepo, `Model _metadata does not exist`);
    await this.metaDataRepo.upsert(
      { key: METADATA_BESTBLOCKS_KEY, value: JSON.stringify(bestBlocks) },
      { transaction: tx },
    );
  }

  private async saveLastFinalizedVerifiedHeight(
    height: number,
    tx: Transaction,
  ) {
    assert(this.metaDataRepo, `Model _metadata does not exist`);
    await this.metaDataRepo.upsert(
      { key: METADATA_LAST_FINALIZED_PROCESSED_KEY, value: height },
      { transaction: tx },
    );
  }

  // remove any records less and equal than input finalized blockHeight
  removeFinalized(blockHeight: number): void {
    Object.entries(this.bestBlocks).map(([bestBlockHeight, hash]) => {
      if (Number(bestBlockHeight) <= blockHeight) {
        delete this.bestBlocks[bestBlockHeight];
      }
    });
  }

  // find closest record from block heights
  getClosestRecord(
    blockHeight: number,
  ): { blockHeight: number; hash: HexString } | undefined {
    // Have the block in the best block, can be verified
    if (Object.keys(this.bestBlocks).length !== 0) {
      const record = Object.entries(this.bestBlocks)
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
  async validateBestBlocks(): Promise<boolean> {
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
            `Block folk found, enqueued un-finalized block at ${lastVerifiableBlock.blockHeight} with hash ${lastVerifiableBlock.hash}, actual hash is ${actualHash} `,
          );
          return false;
        }
      }
    }
    return true;
  }

  async getLastCorrectBestBlock(): Promise<number | undefined> {
    const bestVerifiableBlocks = Object.entries(this.bestBlocks)
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
}
