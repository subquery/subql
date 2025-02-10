// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { reindexInit as baseReindexInit } from '@subql/node-core';
import { ReindexModule } from './reindex.module';

export const reindexInit = (targetHeight: number) =>
  baseReindexInit(ReindexModule, targetHeight);
