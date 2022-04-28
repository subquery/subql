// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {ApiDecoration} from '@polkadot/api/types';
import {Extrinsic, EventRecord, SignedBlock} from '@polkadot/types/interfaces';
import {SubqlCallFilter, SubqlEventFilter, SubqlDatasource} from './project';

export interface Entity {
  id: string;
}

export type ApiAt = ApiDecoration<'promise'> & {rpc: ApiPromise['rpc']};

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

export interface SubstrateBlock extends SignedBlock {
  // parent block's spec version, can be used to decide the correct metadata that should be used for this block.
  specVersion: number;
  timestamp: Date;
  events: EventRecord[];
}

export interface SubstrateExtrinsic {
  // index in the block
  idx: number;
  extrinsic: Extrinsic;
  block: SubstrateBlock;
  events: EventRecord[];
  success: boolean;
}

export interface SubstrateEvent extends EventRecord {
  // index in the block
  idx: number;
  extrinsic?: SubstrateExtrinsic;
  block: SubstrateBlock;
}

export interface AvalancheCallFilter {
  from?: string;
  to?: string;
  function?: string;
}

export interface AvalancheEventFilter {
  topics?: Array<string | null | undefined>;
}

export type AlgorandBlock = Record<string, any>;
export type AlgorandTransaction = Record<string, any>; // TODO
export type AlgorandEvent = Record<string, any>; // TODO

export interface AvalancheResult extends ReadonlyArray<any> {
  readonly [key: string]: any;
}

export type AvalancheBlock = {
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string;
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  number: string;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: string;
  stateRoot: string;
  timestamp: string;
  totalDifficulty: string;
  transactions: AvalancheTransaction[];
  transactionsRoot: string;
  uncles: string[];
};

export type AvalancheTransaction<T extends AvalancheResult = AvalancheResult> = {
  blockHash: string;
  blockNumber: string;
  from: string;
  gas: string;
  gasPrice: string;
  hash: string;
  input: string;
  nonce: string;
  to: string;
  transactionIndex: string;
  value: string;
  v: string;
  r: string;
  s: string;
  args?: T;
};

export type AvalancheEvent<T extends AvalancheResult = AvalancheResult> = {
  logIndex: string;
  blockNumber: string;
  blockHash: string;
  transactionHash: string;
  transactionIndex: string;
  address: string;
  data: string;
  topics: string[];
  args?: T;
};

export interface BlockWrapper<
  B extends SubstrateBlock | AlgorandBlock | AvalancheBlock = SubstrateBlock | AlgorandBlock | AvalancheBlock,
  C extends SubstrateExtrinsic | AlgorandTransaction | AvalancheTransaction =
    | SubstrateExtrinsic
    | AlgorandTransaction
    | AvalancheTransaction,
  E extends SubstrateEvent | AlgorandEvent | AvalancheEvent = SubstrateEvent | AlgorandEvent | AvalancheEvent,
  CF extends SubqlCallFilter | AvalancheCallFilter = SubqlCallFilter | AvalancheCallFilter,
  EF extends SubqlEventFilter | AvalancheEventFilter = SubqlEventFilter | AvalancheEventFilter
> {
  block: B;
  blockHeight: number;
  specVersion?: number;
  hash: string;
  calls?: (filters?: CF | CF[], ds?: SubqlDatasource) => C[];
  events?: (filters?: EF | EF[], ds?: SubqlDatasource) => E[];
}

export interface ApiWrapper<
  BW extends BlockWrapper = SubstrateBlockWrapper | AvalancheBlockWrapper | AlgorandBlockWrapper
> {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getRuntimeChain: () => string;
  getSpecName: () => string;
  getFinalizedBlockHeight: () => Promise<number>;
  getLastHeight: () => Promise<number>;
  fetchBlocks: (bufferBlocks: number[]) => Promise<BW[]>;
  freezeApi: (processor: any, blockContent?: BlockWrapper) => void;
}

export interface AvalancheBlockWrapper
  extends BlockWrapper<
    AvalancheBlock,
    AvalancheTransaction,
    AvalancheEvent,
    AvalancheCallFilter,
    AvalancheEventFilter
  > {
  getTransactions: (filters?: string[]) => Record<string, any>;
}

export type AlgorandBlockWrapper = BlockWrapper<AlgorandBlock, AlgorandTransaction, AlgorandEvent>;

export interface SubstrateBlockWrapper extends BlockWrapper<SubstrateBlock, SubstrateExtrinsic, SubstrateEvent> {
  extrinsics: SubstrateExtrinsic[];
}

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;
