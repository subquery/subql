// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise } from '@polkadot/api';
import { ApiDecoration } from '@polkadot/api/types';
import {
  SubstrateBlock,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';

export interface BlockContent {
  block: SubstrateBlock;
  extrinsics: SubstrateExtrinsic[];
  events: SubstrateEvent[];
}

export type ApiAt = ApiDecoration<'promise'> & { rpc: ApiPromise['rpc'] };
