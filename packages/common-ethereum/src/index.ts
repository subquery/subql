// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export * from './codegen';
export * from './project';

import {EthereumNetworkModule} from '@subql/types-ethereum';
import * as c from './codegen';
import * as p from './project';

// This provides a compiled time check to ensure that the correct exports are provided
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ = {
  ...p,
  ...c,
} satisfies EthereumNetworkModule;
