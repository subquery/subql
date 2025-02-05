// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { IBlockDispatcher } from '@subql/node-core';
import { StellarBlock } from '@subql/types-stellar';

export interface IStellarBlockDispatcher
  extends IBlockDispatcher<StellarBlock> {
  init(
    onDynamicDsCreated: (height: number) => void | Promise<void>,
  ): Promise<void>;
}
