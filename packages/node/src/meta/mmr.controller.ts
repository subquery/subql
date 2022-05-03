// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Controller, Get } from '@nestjs/common';
import { getLogger } from '../utils/logger';
import { MmrService } from './mmr.service';

const logger = getLogger('ready');

@Controller('mmr')
export class MmrController {
  constructor(private mmrService: MmrService) {}

  @Get(':id')
  getMmr() {
    return;
  }

  @Get()
  getLatestMmr() {
    return;
  }

  @Get()
  getMmrs() {
    return;
  }
}
