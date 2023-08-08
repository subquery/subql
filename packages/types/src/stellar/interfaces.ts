// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SorobanRpc} from 'soroban-client';
import {BlockWrapper} from '../interfaces';

export interface StellarBlock {
  ledger: number;
  hash: string;
  events: StellarEvent[];
}

export type StellarEvent = SorobanRpc.EventResponse & {
  value: {
    xdr: string;
    decoded?: string;
  };
};
export interface StellarEventFilter {
  contractId?: string;
  topics?: string[];
}

export type StellarBlockWrapper = BlockWrapper<StellarBlock, StellarEvent>;
