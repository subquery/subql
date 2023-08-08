// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  StellarBlock,
  StellarBlockWrapper,
  StellarEffect,
  StellarEvent,
  StellarOperation,
  StellarTransaction,
} from './stellar';

export interface Entity {
  id: string;
  _name?: string;
  save?: () => Promise<void>;
}

export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

export interface Store {
  get(entity: string, id: string): Promise<Entity | undefined>;
  getByField(entity: string, field: string, value: any, options?: {offset?: number; limit?: number}): Promise<Entity[]>;
  getOneByField(entity: string, field: string, value: any): Promise<Entity | undefined>;
  set(entity: string, id: string, data: Entity): Promise<void>;
  bulkCreate(entity: string, data: Entity[]): Promise<void>;
  //if fields in provided, only specify fields will be updated
  bulkUpdate(entity: string, data: Entity[], fields?: string[]): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
  bulkRemove(entity: string, ids: string[]): Promise<void>;
}

export interface BlockWrapper<
  B extends StellarBlock = StellarBlock,
  T extends StellarTransaction = StellarTransaction,
  O extends StellarOperation = StellarOperation,
  EF extends StellarEffect = StellarEffect,
  E extends StellarEvent = StellarEvent
> {
  block: B;
  transactions: T[];
  operations: O[];
  effects: EF[];
  events?: E[];
}

export interface ApiWrapper<BW extends BlockWrapper = StellarBlockWrapper> {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getRuntimeChain: () => string;
  getChainId: () => string;
  getSpecName: () => string;
  getFinalizedBlockHeight: () => Promise<number>;
  getBestBlockHeight: () => Promise<number>;
  //getBlockByHeightOrHash: (hashOrHeight: number | string) => Promise<Block>;
  fetchBlocks: (bufferBlocks: number[]) => Promise<BW[]>;
}

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;
