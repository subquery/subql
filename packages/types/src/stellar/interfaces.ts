// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Horizon, rpc, xdr} from '@stellar/stellar-sdk';
import {BlockWrapper} from '../interfaces';

export type StellarBlockNew = {
  transactions: StellarTransactionNew[];
  operations: StellarOperationNew[];
  effects: StellarEffectNew[];
  events: StellarEventNew[];
};

export type StellarTransactionNew = {
  tx: rpc.Api.TransactionInfo;
  operations: StellarOperationNew[];
  events: StellarEventNew[];
};

export type StellarOperationNew = {
  operation: xdr.Operation;
  transaction: StellarTransactionNew;
};
export type StellarEffectNew = {
  effect: unknown;
  transaction: StellarTransactionNew;
};
export type StellarEventNew = {
  event: rpc.Api.EventResponse;
  block: StellarBlockNew;
  tx: StellarTransactionNew;
};

/// OLD STUFFF

export type StellarBlock = Omit<Horizon.ServerApi.LedgerRecord, 'effects' | 'operations' | 'self' | 'transactions'> & {
  effects: StellarEffect[];
  operations: StellarOperation[];
  transactions: StellarTransaction[];
  events: SorobanEvent[];
};

export type StellarTransaction = Omit<
  Horizon.ServerApi.TransactionRecord,
  'effects' | 'ledger' | 'operations' | 'precedes' | 'self' | 'succeeds'
> & {
  effects: StellarEffect[];
  ledger: StellarBlock | null;
  operations: StellarOperation[];
  events: SorobanEvent[];
};

export type StellarOperation<T extends Horizon.HorizonApi.BaseOperationResponse = Horizon.ServerApi.OperationRecord> =
  Omit<T, 'self' | 'succeeds' | 'precedes' | 'effects' | 'transaction'> & {
    effects: StellarEffect[];
    transaction: StellarTransaction | null;
    ledger: StellarBlock | null;
    events: SorobanEvent[];
  };

export type StellarEffect<T extends Horizon.ServerApi.EffectRecord = Horizon.ServerApi.EffectRecord> = Omit<
  T,
  'operation'
> & {
  operation: StellarOperation | null;
  transaction: StellarTransaction | null;
  ledger: StellarBlock | null;
};

export type SorobanRpcEventResponse = rpc.Api.EventResponse;

export type SorobanEvent = Omit<SorobanRpcEventResponse, 'ledger'> & {
  ledger: StellarBlock | null;
  transaction: StellarTransaction | null;
  operation: StellarOperation | null;
};

export interface StellarBlockFilter {
  modulo?: number;
  timestamp?: string;
}

export interface StellarTransactionFilter {
  account?: string;
}

export interface StellarOperationFilter {
  type?: Horizon.HorizonApi.OperationResponseType;
  sourceAccount?: string;
}

export interface StellarEffectFilter {
  type?: string;
  account?: string;
}

export interface SorobanEventFilter {
  contractId?: string;
  topics?: string[];
}

export type StellarBlockWrapper = BlockWrapper<
  StellarBlock,
  StellarTransaction,
  StellarOperation,
  StellarEffect,
  SorobanEvent
>;
