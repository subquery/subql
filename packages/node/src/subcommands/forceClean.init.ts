// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { forceClean } from '@subql/node-core';
import { ForceCleanModule } from './forceClean.module';

export const forceCleanInit = (): Promise<void> => forceClean(ForceCleanModule);
