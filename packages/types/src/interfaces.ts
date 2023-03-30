// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {CosmWasmClient} from '@cosmjs/cosmwasm-stargate';
import {DecodedTxRaw} from '@cosmjs/proto-signing';
import {Block, Event} from '@cosmjs/stargate';
import {Log} from '@cosmjs/stargate/build/logs';
import {TxData, Header} from '@cosmjs/tendermint-rpc';
import {Validator} from '@cosmjs/tendermint-rpc/build/tendermint34/responses';

export interface CosmWasmSafeClient extends CosmWasmClient {
  validator(): () => Promise<readonly Validator[]>;
}

export interface Entity {
  id: string;
}

export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

export interface Store {
  count(entity: string, field?: string, value?: any, options?: {distinct?: boolean; col?: string}): Promise<number>;
  get(entity: string, id: string): Promise<Entity | null>;
  getByField(entity: string, field: string, value: any, options?: {offset?: number; limit?: number}): Promise<Entity[]>;
  getOneByField(entity: string, field: string, value: any): Promise<Entity | null>;
  set(entity: string, id: string, data: Entity): Promise<void>;
  bulkCreate(entity: string, data: Entity[]): Promise<void>;
  //if fields in provided, only specify fields will be updated
  bulkUpdate(entity: string, data: Entity[], fields?: string[]): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
}

export interface CosmosBlock {
  block: Block;
  header: Header; // Full header
  txs: TxData[];
}

export interface CosmosTransaction {
  idx: number;
  block: CosmosBlock;
  hash: string;
  tx: TxData;
  decodedTx: DecodedTxRaw;
}

export interface CosmosMessage<T = any> {
  idx: number;
  block: CosmosBlock;
  tx: CosmosTransaction;
  msg: {
    typeUrl: string;
    decodedMsg: T;
  };
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
