// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import { isCustomDs } from '@subql/common-substrate';
import { BaseDsProcessorService } from '@subql/node-core';
import {
  SubstrateCustomDatasource,
  SubstrateCustomHandler,
  SubstrateDatasource,
  SubstrateDatasourceProcessor,
  SubstrateMapping,
} from '@subql/types';

@Injectable()
export class DsProcessorService extends BaseDsProcessorService<
  SubstrateDatasource,
  SubstrateCustomDatasource<string, SubstrateMapping<SubstrateCustomHandler>>,
  SubstrateDatasourceProcessor<string, Record<string, unknown>>
> {
  protected isCustomDs = isCustomDs;
}
