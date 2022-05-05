// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BlockInfo, Event, TxInfo, TxLog, Msg, WasmMsg, CodeInfo, AccAddress, ContractInfo} from '@terra-money/terra.js';

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
  txs: TxInfo[];
}

export interface TerraTransaction {
  idx: number;
  block: TerraBlock;
  tx: TxInfo;
}

export interface TerraMessage<M extends Msg = Msg> {
  idx: number;
  block: TerraBlock;
  tx: TerraTransaction;
  msg: M;
}

export interface TerraEvent<M extends Msg = Msg> {
  idx: number;
  block: TerraBlock;
  tx: TerraTransaction;
  msg: TerraMessage<M>;
  log: TxLog;
  event: Event;
}

export type TerraContractMessage = TerraMessage<WasmMsg>;

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;

export interface ITerraSafeApi {
  codeInfo(codeID: number): Promise<CodeInfo>;
  contractInfo(contractAddress: string): Promise<ContractInfo>;
  contractQuery<T>(contractAddress: string, query: Object): Promise<T>;
}
