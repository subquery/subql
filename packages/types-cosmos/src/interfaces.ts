// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DecodedTxRaw} from '@cosmjs/proto-signing';
import {Block, IndexedTx} from '@cosmjs/stargate';
import {Event, Log} from '@cosmjs/stargate/build/logs';
export interface Entity {
  id: string;
}

export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

export interface Store {
  get(entity: string, id: string): Promise<Entity | null>;
  getByField(entity: string, field: string, value): Promise<Entity[]>;
  getOneByField(entity: string, field: string, value): Promise<Entity | null>;
  set(entity: string, id: string, data: Entity): Promise<void>;
  bulkCreate(entity: string, data: Entity[]): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
}

export interface CosmosBlock {
  block: Block;
  txs: IndexedTx[];
}

export interface CosmosTransaction {
  idx: number;
  block: CosmosBlock;
  tx: IndexedTx;
  decodedTx: DecodedTxRaw;
}

export interface CosmosMessage {
  idx: number;
  block: CosmosBlock;
  tx: CosmosTransaction;
  msg: any;
}

export interface CosmosEvent {
  idx: number;
  block: CosmosBlock;
  tx: CosmosTransaction;
  msg: CosmosMessage;
  log: Log;
  event: Event;
}

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;
