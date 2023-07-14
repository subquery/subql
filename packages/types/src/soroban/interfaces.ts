// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SorobanRpc} from 'soroban-client';
import {BlockWrapper} from '../interfaces';

export interface SorobanBlock {
  height: number;
  hash: string;
  events: SorobanEvent[];
}

export type SorobanEvent = SorobanRpc.EventResponse;

export interface SorobanEventFilter {
  contractId?: string;
  topics?: string[];
}

export type SorobanBlockWrapper = BlockWrapper<SorobanBlock, SorobanEvent>;
