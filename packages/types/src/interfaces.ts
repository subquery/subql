// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {AnyTuple, Codec} from '@polkadot/types-codec/types';
import {GenericExtrinsic} from '@polkadot/types/extrinsic';
import {EventRecord, SignedBlock, Header} from '@polkadot/types/interfaces';
import {IEvent} from '@polkadot/types/types';

export interface Entity {
  id: string;
  _name?: string;
  save?: () => Promise<void>;
}

export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

type SingleOperators = '=' | '!=';
type ArrayOperators = 'in' | '!in';
export type FieldOperators = SingleOperators | ArrayOperators;

export type FieldsExpression<T> =
  | [field: keyof T, operator: SingleOperators, value: T[keyof T]]
  | [field: keyof T, operator: ArrayOperators, value: Array<T[keyof T]>];

export interface Store {
  get(entity: string, id: string): Promise<Entity | undefined>;
  getByField(entity: string, field: string, value: any, options?: {offset?: number; limit?: number}): Promise<Entity[]>;
  getByFields<T extends Entity>(
    entity: string,
    filter: FieldsExpression<T>[],
    options?: {offset?: number; limit?: number}
  ): Promise<T[]>;
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

interface BaseSubstrateEvent<T extends AnyTuple = AnyTuple> extends TypedEventRecord<T> {
  // index in the block
  idx: number;
}

// A subset of SubstrateBlock with just the header
export interface BlockHeader {
  block: {
    header: Header;
  };
  events: EventRecord[];
}

export interface LightSubstrateEvent<T extends AnyTuple = AnyTuple> extends BaseSubstrateEvent<T> {
  block: BlockHeader;
}

export interface SubstrateEvent<T extends AnyTuple = AnyTuple> extends BaseSubstrateEvent<T> {
  extrinsic?: SubstrateExtrinsic;
  block: SubstrateBlock;
}

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;

export type TypedEventRecord<T extends AnyTuple> = Omit<EventRecord, 'event'> & {
  event: IEvent<T>;
};
