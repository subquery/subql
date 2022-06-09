// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Extrinsic, EventRecord, SignedBlock} from '@polkadot/types/interfaces';
import {BlockWrapper} from '../interfaces';

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

export interface SubstrateBlockWrapper extends BlockWrapper<SubstrateBlock, SubstrateExtrinsic, SubstrateEvent> {
  extrinsics: SubstrateExtrinsic[];
}
