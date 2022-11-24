// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// import {ApiPromise} from '@polkadot/api';
// import {ApiDecoration} from '@polkadot/api/types';
import {Block} from '@ethersproject/abstract-provider';
import {
  EthereumBlock,
  EthereumBlockWrapper,
  EthereumLog,
  EthereumLogFilter,
  EthereumTransaction,
  EthereumTransactionFilter,
} from './ethereum';

export interface Entity {
  id: string;
}

// export type ApiAt = ApiDecoration<'promise'> & {rpc: ApiPromise['rpc']};

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

export interface BlockWrapper<
  B extends EthereumBlock = EthereumBlock,
  C extends EthereumTransaction = EthereumTransaction,
  E extends EthereumLog = EthereumLog,
  CF extends EthereumTransactionFilter = EthereumTransactionFilter,
  EF extends EthereumLogFilter = EthereumLogFilter
> {
  block: B;
  blockHeight: number;
  specVersion?: number;
  hash: string;
  calls?: (filters?: CF | CF[], ds?: any) => C[];
  transactions?: C[];
  events?: (filters?: EF | EF[], ds?: any) => E[];
  logs?: E[];
}

export interface ApiWrapper<BW extends BlockWrapper = EthereumBlockWrapper> {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getRuntimeChain: () => string;
  getChainId: () => number;
  getSpecName: () => string;
  getFinalizedBlockHeight: () => Promise<number>;
  getLastHeight: () => Promise<number>;
  fetchBlocks: (bufferBlocks: number[]) => Promise<BW[]>;
  freezeApi: (processor: any, blockContent?: BlockWrapper) => void;
}

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;
