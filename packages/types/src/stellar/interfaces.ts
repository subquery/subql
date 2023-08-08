// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SorobanRpc} from 'soroban-client';
import {Horizon, ServerApi} from 'stellar-sdk';
import {BaseEffectRecord} from 'stellar-sdk/lib/types/effects';
import {BlockWrapper} from '../interfaces';

export type StellarBlock = Omit<ServerApi.LedgerRecord, 'effects' | 'operations' | 'self' | 'transactions'> & {
  effects: StellarEffect[];
  operations: StellarOperation[];
  transactions: StellarTransaction[];
};

export type StellarTransaction = Omit<
  ServerApi.TransactionRecord,
  'account' | 'effects' | 'ledger' | 'operations' | 'precedes' | 'self' | 'succeeds'
> & {
  account: ServerApi.AccountRecord;
  effects: StellarEffect[];
  ledger: StellarBlock;
  operations: StellarOperation[];
};

export type StellarOperation<T extends Horizon.BaseOperationResponse = ServerApi.OperationRecord> = Omit<
  T,
  'self' | 'succeeds' | 'precedes' | 'effects' | 'transaction'
> & {
  effects: StellarEffect[];
  transaction: StellarTransaction;
  ledger: StellarBlock;
};

export type StellarEffect<T extends BaseEffectRecord = ServerApi.EffectRecord> = T & {
  operation: StellarOperation;
  transaction: StellarTransaction;
  ledger: StellarBlock;
};

export type StellarEvent = SorobanRpc.EventResponse & {
  value: {
    xdr: string;
    decoded?: string;
  };
};

export interface StellarBlockFilter {
  modulo?: number;
  timestamp?: string;
}

export interface StellarTransactionFilter {
  account?: string;
}

export interface StellarOperationFilter {
  type?: Horizon.OperationResponseType;
  source_account?: string;
}

export interface StellarEffectFilter {
  type?: string;
  account?: string;
}

export interface StellarEventFilter {
  contractId?: string;
  topics?: string[];
}

export type StellarBlockWrapper = BlockWrapper<
  StellarBlock,
  StellarTransaction,
  StellarOperation,
  StellarEffect,
  StellarEvent
>;
