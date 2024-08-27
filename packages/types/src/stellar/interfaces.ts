// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Contract, xdr, Horizon} from '@stellar/stellar-sdk';
import {BlockWrapper} from '../interfaces';

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
// COPIED FROM SOROBAN, due to no longer export
export interface SorobanRpcEventResponse extends SorobanRpcBaseEventResponse {
  contractId?: Contract;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}
export type EventType = 'contract' | 'system' | 'diagnostic';

interface SorobanRpcBaseEventResponse {
  id: string;
  type: EventType;
  ledger: number;
  ledgerClosedAt: string;
  pagingToken: string;
  inSuccessfulContractCall: boolean;
  txHash: string;
}

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
