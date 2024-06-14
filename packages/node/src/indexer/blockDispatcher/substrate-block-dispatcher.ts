// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { IBlockDispatcher } from '@subql/node-core';
import { SubstrateBlock } from '@subql/types';
import { RuntimeService } from '../runtime/runtimeService';

export interface ISubstrateBlockDispatcher
  extends IBlockDispatcher<SubstrateBlock> {
  init(
    onDynamicDsCreated: (height: number) => void,
    runtimeService?: RuntimeService,
  ): Promise<void>;
}
