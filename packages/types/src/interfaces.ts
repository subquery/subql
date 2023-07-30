// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {CosmWasmClient} from '@cosmjs/cosmwasm-stargate';
import {DecodedTxRaw} from '@cosmjs/proto-signing';
import {Event} from '@cosmjs/stargate';
import {Log} from '@cosmjs/stargate/build/logs';
import {Validator, TxData, Block, BlockId, Header} from '@cosmjs/tendermint-rpc/build/tendermint37';

export interface CosmWasmSafeClient extends CosmWasmClient {
  validators: () => Promise<readonly Validator[]>;
}

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

export interface CosmosBlock {
  blockId: BlockId;
  block: {id: string} & Block;
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
