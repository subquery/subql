// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export * from './interfaces';

import {CompatEntity} from '@subql/types-core';

// Register test functions to a global array
export function subqlTest<E extends CompatEntity<any> = CompatEntity<any>>(
  name: string,
  blockHeight: number,
  dependentEntities: E[],
  expectedEntities: E[],
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
