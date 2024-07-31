// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {AnyTuple, Codec} from '@polkadot/types-codec/types';
import {GenericExtrinsic} from '@polkadot/types/extrinsic';
import {EventRecord, SignedBlock, Header} from '@polkadot/types/interfaces';
import {IEvent} from '@polkadot/types/types';

export interface SubstrateBlock extends SignedBlock {
  // parent block's spec version, can be used to decide the correct metadata that should be used for this block.
  specVersion: number;
  timestamp: Date | undefined;
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

export type TypedEventRecord<T extends AnyTuple> = Omit<EventRecord, 'event'> & {
  event: IEvent<T>;
};
