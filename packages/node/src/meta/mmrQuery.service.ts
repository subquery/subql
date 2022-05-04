// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { MmrPayload } from '../indexer/events';
import { MmrService } from '../indexer/mmr.service';

@Injectable()
export class MmrQueryService {
  constructor(protected mmrService: MmrService) {}

  async getMmr(blockHeight: number): Promise<MmrPayload> {
    return this.mmrService.getMmr(blockHeight);
  }

  async getLatestMmr(): Promise<MmrPayload> {
    return this.mmrService.getLatestMmr();
  }
}
