// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SorobanRpc} from 'soroban-client';
import {BlockWrapper} from '../interfaces';

export interface SorobanBlock {
  ledger: number;
  hash: string;
  events: SorobanEvent[];
}

export type SorobanEvent = SorobanRpc.EventResponse & {
  value: {
    xdr: string;
    decoded?: string;
  };
};
export interface SorobanEventFilter {
  contractId?: string;
  topics?: string[];
}

export type SorobanBlockWrapper = BlockWrapper<SorobanBlock, SorobanEvent>;
