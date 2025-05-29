// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {StellarBlock, StellarEffect, SorobanEvent, StellarOperation, StellarTransaction} from './stellar';

export interface BlockWrapper<
  B extends StellarBlock = StellarBlock,
  T extends StellarTransaction = StellarTransaction,
  O extends StellarOperation = StellarOperation,
  EF extends StellarEffect = StellarEffect,
  E extends SorobanEvent = SorobanEvent
> {
  block: B;
  transactions: T[];
  operations: O[];
  effects: EF[];
  events?: E[];
}

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;
