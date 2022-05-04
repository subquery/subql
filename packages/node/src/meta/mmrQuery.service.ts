// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { Injectable } from '@nestjs/common';
import {
  FileBasedDb,
  keccak256FlyHash,
  MMR,
} from '@subql/x-merkle-mountain-range';
import { NodeConfig } from '../configure/NodeConfig';
import { MmrPayload } from '../indexer/events';

@Injectable()
export class MmrQueryService {
  fileBasedMmr: MMR;

  constructor(protected nodeConfig: NodeConfig) {
    if (fs.existsSync(nodeConfig.mmrPath)) {
      const fileBasedDb = FileBasedDb.open(nodeConfig.mmrPath);
      this.fileBasedMmr = new MMR(keccak256FlyHash, fileBasedDb);
      console.log('already read mmrQuery service');
    }
  }

  async getMmr(id: number): Promise<MmrPayload> {
    const value = await this.fileBasedMmr.getRoot(id);
    return { leafIndex: id, value };
  }

  async getLatestMmr(): Promise<MmrPayload> {
    // latest leaf index need fetch from .db, as original method will use cache
    const mmrIndex = (await this.fileBasedMmr.db.getLeafLength()) - 1;
    const value = await this.fileBasedMmr.getRoot(mmrIndex);
    return { leafIndex: mmrIndex, value };
  }
}
