// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { hexToU8a } from '@polkadot/util';
import { Sequelize } from 'sequelize';
import { SubqueryProject } from '../configure/project.model';
import { MetadataRepo, MetadataFactory } from './entities/Metadata.entity';
import { PoiFactory, PoiRepo } from './entities/Poi.entity';

const DEFAULT_PARENT_HASH = hexToU8a('0x00');
@Injectable()
export class PoiService implements OnApplicationShutdown {
  private isShutdown = false;
  private latestPoiBlockHash: Uint8Array;
  private poiRepo: PoiRepo;
  private metadataRepo: MetadataRepo;
  private blockOffset: number;
  private schema: string;

  constructor(
    protected project: SubqueryProject,
    protected sequelize: Sequelize,
  ) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  async init(schema: string): Promise<void> {
    this.schema = schema;
    this.poiRepo = PoiFactory(this.sequelize, this.schema);
    this.metadataRepo = MetadataFactory(this.sequelize, this.schema);

    await Promise.all([
      (this.latestPoiBlockHash = await this.getLatestPoiBlockHash()),
      (this.blockOffset = await this.fetchBlockOffsetFromDb()),
    ]);
  }

  async fetchPoiBlockHashFromDb(): Promise<Uint8Array | null> {
    const lastPoi = await this.poiRepo.findOne({
      order: [['id', 'DESC']],
    });
    if (lastPoi === null || lastPoi === undefined) {
      return null;
    } else if (lastPoi !== null && lastPoi.hash) {
      return lastPoi.hash;
    } else {
      throw new Error(`Poi found but can not get latest hash`);
    }
  }

  async fetchBlockOffsetFromDb(): Promise<number | null> {
    const blockOffset = await this.metadataRepo.findOne({
      where: { key: 'blockOffset' },
    });
    if (blockOffset === null) {
      throw new Error(`Poi service failed to fetch block offset from metadata`);
    }
    return Number(blockOffset.value);
  }

  async getBlockOffset(): Promise<number> {
    if (!this.blockOffset) {
      this.blockOffset = await this.fetchBlockOffsetFromDb();
    }
    return this.blockOffset;
  }

  async getLatestPoiBlockHash(): Promise<Uint8Array | null> {
    if (!this.latestPoiBlockHash) {
      const poiBlockHash = await this.fetchPoiBlockHashFromDb();
      if (poiBlockHash === null || poiBlockHash === undefined) {
        this.latestPoiBlockHash = DEFAULT_PARENT_HASH;
      } else {
        this.latestPoiBlockHash = poiBlockHash;
      }
    }
    return this.latestPoiBlockHash;
  }

  setLatestPoiBlockHash(hash: Uint8Array): void {
    this.latestPoiBlockHash = hash;
  }
}
