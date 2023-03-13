// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { IBlockDispatcher } from '@subql/node-core';
import { RuntimeService } from '../runtime/runtimeService';

export interface ISubstrateBlockDispatcher extends IBlockDispatcher {
  init(
    onDynamicDsCreated: (height: number) => Promise<void>,
    runtimeService?: RuntimeService,
  ): Promise<void>;
}
