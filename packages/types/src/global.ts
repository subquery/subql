// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Server} from 'soroban-client';
import '@subql/types-core/dist/global';

declare global {
  const api: Server;
}
