// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SorobanRpc, Contract, xdr} from 'stellar-sdk';
import {HorizonApi, ServerApi} from 'stellar-sdk/lib/horizon';
import {BaseEffectRecord} from 'stellar-sdk/lib/horizon/types/effects';
import {BlockWrapper} from '../interfaces';

export type StellarBlock = Omit<ServerApi.LedgerRecord, 'effects' | 'operations' | 'self' | 'transactions'> & {
  effects: StellarEffect[];
  operations: StellarOperation[];
  transactions: StellarTransaction[];
  events: SorobanEvent[];
};

export type StellarTransaction = Omit<
  ServerApi.TransactionRecord,
  'effects' | 'ledger' | 'operations' | 'precedes' | 'self' | 'succeeds'
> & {
  effects: StellarEffect[];
  ledger: StellarBlock;
  operations: StellarOperation[];
  events: SorobanEvent[];
};

export type StellarOperation<T extends HorizonApi.BaseOperationResponse = ServerApi.OperationRecord> = Omit<
  T,
  'self' | 'succeeds' | 'precedes' | 'effects' | 'transaction'
> & {
  effects: StellarEffect[];
  transaction: StellarTransaction;
  ledger: StellarBlock;
  events: SorobanEvent[];
};

export type StellarEffect<T extends BaseEffectRecord = ServerApi.EffectRecord> = Omit<T, 'operation'> & {
  operation: StellarOperation;
  transaction: StellarTransaction;
  ledger: StellarBlock;
};
// COPIED FROM SOROBAN, due to no longer export
export interface SorobanRpcEventResponse extends SorobanRpcBaseEventResponse {
  contractId?: Contract;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}

interface SorobanRpcBaseEventResponse {
  id: string;
  type: SorobanRpc.Api.EventType;
  ledger: number;
  ledgerClosedAt: string;
  pagingToken: string;
  inSuccessfulContractCall: boolean;
}

export type SorobanEvent = Omit<SorobanRpcEventResponse, 'ledger'> & {
  value: {
    xdr: string;
    decoded?: string;
  };
  ledger: StellarBlock;
  transaction: StellarTransaction;
  operation: StellarOperation;
};

export interface StellarBlockFilter {
  modulo?: number;
  timestamp?: string;
}

export interface StellarTransactionFilter {
  account?: string;
}

export interface StellarOperationFilter {
  type?: HorizonApi.OperationResponseType;
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
