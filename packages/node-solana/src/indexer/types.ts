// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise } from '@polkadot/api';
import { ApiDecoration } from '@polkadot/api/types';
import {
  Entity,
  SolanaBlock
} from '@subql/types-solana';

export interface BlockContent {
  block: SolanaBlock;
}

export enum OperationType {
  Set = 'Set',
  Remove = 'Remove',
}

export type OperationEntity = {
  operation: OperationType;
  entityType: string;
  data: Entity | string;
};

export type ApiAt = ApiDecoration<'promise'> & { rpc: ApiPromise['rpc'] };
