// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { IBlockDispatcher } from '@subql/node-core';
import { RuntimeService } from '../runtime/runtimeService';

export interface ISubstrateBlockDispatcher extends IBlockDispatcher {
  init(
    onDynamicDsCreated: (height: number) => Promise<void>,
    runtimeService?: RuntimeService,
  ): Promise<void>;
}
