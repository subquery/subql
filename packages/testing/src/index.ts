// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export * from './interfaces';

import {Entity} from '@subql/types-core';

// Register test functions to a global array
export function subqlTest(
  name: string,
  blockHeight: number,
  dependentEntities: Entity[],
  expectedEntities: Entity[],
  handler: string
): void {
  (global as any).subqlTests = (global as any).subqlTests ?? [];

  (global as any).subqlTests.push({
    name,
    blockHeight,
    dependentEntities,
    expectedEntities,
    handler,
  });
}
