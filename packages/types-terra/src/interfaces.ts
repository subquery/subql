// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BlockInfo, EventsByType, MsgExecuteContract, Fee, Msg} from '@terra-money/terra.js';

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

export interface TerraBlock {
  block: BlockInfo;
}

/*
export interface TerraEvent {
  event: EventsByType;
  block: BlockInfo;
}
*/

export interface TerraEvent {
  event: EventsByType[];
  txData: Msg.Data[];
  blockNumber: number;
  blockHash: string;
  timestamp: string;
  transactionHash: string;
}

export interface TerraCall {
  from: string;
  to: string;
  fee: Fee.Data;
  data: MsgExecuteContract.Data;
  hash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: string;
  signatures: string[];
}
