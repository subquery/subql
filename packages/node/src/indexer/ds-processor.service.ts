// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import {
  isCustomDs,
  SubqlStellarCustomDataSource,
  SubqlStellarDataSource,
  SubqlDatasourceProcessor,
} from '@subql/common-stellar';
import { BaseDsProcessorService } from '@subql/node-core';

@Injectable()
export class DsProcessorService extends BaseDsProcessorService<
  SubqlStellarDataSource,
  SubqlStellarCustomDataSource<string>,
  SubqlDatasourceProcessor<string, Record<string, unknown>>
> {
  protected isCustomDs = isCustomDs;
}
