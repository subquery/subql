// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {AnyTuple, Codec} from '@polkadot/types-codec/types';
import {GenericExtrinsic} from '@polkadot/types/extrinsic';
import {EventRecord, SignedBlock} from '@polkadot/types/interfaces';
import {IEvent} from '@polkadot/types/types';

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

export interface SubstrateBlock extends SignedBlock {
  // parent block's spec version, can be used to decide the correct metadata that should be used for this block.
  specVersion: number;
  timestamp: Date;
  events: EventRecord[];
}

export interface SubstrateExtrinsic<A extends AnyTuple = AnyTuple> {
  // index in the block
  idx: number;
  extrinsic: GenericExtrinsic<A>;
  block: SubstrateBlock;
  events: TypedEventRecord<Codec[]>[];
  success: boolean;
}

export interface SubstrateEvent<T extends AnyTuple = AnyTuple> extends TypedEventRecord<T> {
  // index in the block
  idx: number;
  extrinsic?: SubstrateExtrinsic;
  block: SubstrateBlock;
}

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;

export type TypedEventRecord<T extends AnyTuple> = Omit<EventRecord, 'event'> & {
  event: IEvent<T>;
};
