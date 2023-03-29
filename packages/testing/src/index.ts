// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export * from './interfaces';

import {Entity} from '@subql/types';
import {HandlerFunction} from './interfaces';

// Register test functions to a global array
export function subqlTest(
  name: string,
  blockHeight: number,
  dependentEntities: Entity[],
  expectedEntities: Entity[],
  handler: HandlerFunction,
  handlerKind: string
): void {
  (global as any).subqlTests = (global as any).subqlTests ?? [];

  (global as any).subqlTests.push({
    name,
    blockHeight,
    dependentEntities,
    expectedEntities,
    handler,
    handlerKind,
  });
}
