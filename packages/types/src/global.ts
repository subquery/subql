// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SorobanRpc} from 'stellar-sdk';
import '@subql/types-core/dist/global';

declare global {
  const api: SorobanRpc.Server;
}
