// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Controller, Get} from '@nestjs/common';
import {MetaService} from './meta.service';

@Controller('meta')
export class MetaController {
  constructor(private metaService: MetaService) {}

  @Get()
  getMeta() {
    return this.metaService.getMeta();
  }
}
