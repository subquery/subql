// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Entity} from '@subql/types';

export type HandlerFunction = <T = any>(input: T) => Promise<void>;

export type SubqlTest = {
  name: string;
  blockHeight: number;
  dependentEntities: Entity[];
  expectedEntities: Entity[];
  handler: string;
};
