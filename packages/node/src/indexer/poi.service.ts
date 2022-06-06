// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { hexToU8a } from '@polkadot/util';
import { NodeConfig } from '@subql/node-core/configure';
import { PoiFactory, PoiRepo } from '@subql/node-core/indexer/entities';
import { Sequelize } from 'sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';

const DEFAULT_PARENT_HASH = hexToU8a('0x00');

@Injectable()
export class PoiService implements OnApplicationShutdown {
  private isShutdown = false;
  private latestPoiBlockHash: Uint8Array;
  private poiRepo: PoiRepo;
  private schema: string;

  constructor(
    protected nodeConfig: NodeConfig,
    protected project: SubqueryProject,
    protected sequelize: Sequelize,
  ) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  async init(schema: string): Promise<void> {
    this.schema = schema;
    this.poiRepo = PoiFactory(this.sequelize, this.schema);
    this.latestPoiBlockHash = await this.getLatestPoiBlockHash();
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
