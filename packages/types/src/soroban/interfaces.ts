// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SorobanRpc} from 'soroban-client';
import {Horizon, ServerApi} from 'stellar-sdk';
import {BaseEffectRecord} from 'stellar-sdk/lib/types/effects';
import {BlockWrapper} from '../interfaces';

export type SorobanBlock = Omit<ServerApi.LedgerRecord, 'effects' | 'operations' | 'self' | 'transactions'> & {
  effects: SorobanEffect[];
  operations: SorobanOperation[];
  transactions: SorobanTransaction[];
};

export type SorobanTransaction = Omit<
  ServerApi.TransactionRecord,
  'account' | 'effects' | 'ledger' | 'operations' | 'precedes' | 'self' | 'succeeds'
> & {
  account: ServerApi.AccountRecord;
  effects: SorobanEffect[];
  ledger: SorobanBlock;
  operations: SorobanOperation[];
};

export type SorobanOperation<T extends Horizon.BaseOperationResponse = ServerApi.OperationRecord> = Omit<
  T,
  'self' | 'succeeds' | 'precedes' | 'effects' | 'transaction'
> & {
  effects: SorobanEffect[];
  transaction: SorobanTransaction;
  ledger: SorobanBlock;
};

export type SorobanEffect<T extends BaseEffectRecord = ServerApi.EffectRecord> = T & {
  operation: SorobanOperation;
  transaction: SorobanTransaction;
  ledger: SorobanBlock;
};

export type SorobanEvent = SorobanRpc.EventResponse & {
  value: {
    xdr: string;
    decoded?: string;
  };
};

export interface SorobanBlockFilter {
  modulo?: number;
  timestamp?: string;
}

export interface SorobanTransactionFilter {
  account?: string;
}

export interface SorobanOperationFilter {
  type?: Horizon.OperationResponseType;
  source_account?: string;
}

export interface SorobanEffectFilter {
  type?: string;
  account?: string;
}

export interface SorobanEventFilter {
  contractId?: string;
  topics?: string[];
}

export type SorobanBlockWrapper = BlockWrapper<
  SorobanBlock,
  SorobanTransaction,
  SorobanOperation,
  SorobanEffect,
  SorobanEvent
>;
