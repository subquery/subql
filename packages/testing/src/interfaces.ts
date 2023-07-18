// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Entity} from '@subql/types';

export type HandlerFunction = <T = any>(input: T) => Promise<void>;

export type SubqlTest = {
  name: string;
  blockHeight: number;
  dependentEntities: Entity[];
  expectedEntities: Entity[];
  handler: string;
};
