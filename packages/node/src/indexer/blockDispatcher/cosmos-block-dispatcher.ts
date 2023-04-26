// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { IBlockDispatcher } from '@subql/node-core';

export interface ICosmosBlockDispatcher extends IBlockDispatcher {
  init(onDynamicDsCreated: (height: number) => Promise<void>): Promise<void>;
}
