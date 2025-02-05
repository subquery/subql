// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  Account,
  Address,
  Contract,
  FeeBumpTransaction,
  Transaction,
  xdr,
  rpc,
} from '@stellar/stellar-sdk';
import { getLogger } from '@subql/node-core';

// import { Durability } from 'soroban-client/lib/server';
import { SorobanServer } from './soroban.server';

const logger = getLogger('safe.api.stellar');

export default class SafeStellarProvider extends SorobanServer {
  private blockHeight: number;
  private baseApi: rpc.Server;

  constructor(baseApi: rpc.Server, blockHeight: number) {
    super(baseApi.serverURL.toString());
    this.blockHeight = blockHeight;
    this.baseApi = baseApi;
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getAccount(address: string): Promise<Account> {
    throw new Error('Method getAccount is not implemented.');
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getHealth(): Promise<rpc.Api.GetHealthResponse> {
    throw new Error('Method getHealth is not implemented.');
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getContractData(
    contract: string | Address | Contract,
    key: xdr.ScVal,
    durability: rpc.Durability = rpc.Durability.Persistent,
  ): Promise<rpc.Api.LedgerEntryResult> {
    throw new Error('Method getContractData is not implemented.');
  }

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/require-await
  async getLedgerEntries(
    keys: xdr.LedgerKey[],
  ): Promise<rpc.Api.GetLedgerEntriesResponse> {
    throw new Error('Method getLedgerEntries is not implemented.');
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getTransaction(hash: string): Promise<rpc.Api.GetTransactionResponse> {
    throw new Error('Method getTransaction is not implemented.');
  }

  async getEvents(
    request: rpc.Server.GetEventsRequest,
  ): Promise<rpc.Api.GetEventsResponse> {
    return this.baseApi.getEvents({
      startLedger: this.blockHeight,
      filters: [],
    });
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getNetwork(): Promise<rpc.Api.GetNetworkResponse> {
    throw new Error('Method getNetwork is not implemented.');
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async getLatestLedger(): Promise<rpc.Api.GetLatestLedgerResponse> {
    throw new Error('Method getLatestLedger is not implemented.');
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async simulateTransaction(
    transaction: Transaction | FeeBumpTransaction,
  ): Promise<rpc.Api.SimulateTransactionResponse> {
    throw new Error('Method simulateTransaction is not implemented.');
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async prepareTransaction(
    transaction: Transaction | FeeBumpTransaction,
  ): Promise<Transaction> {
    throw new Error('Method prepareTransaction is not implemented.');
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async sendTransaction(
    transaction: Transaction | FeeBumpTransaction,
  ): Promise<rpc.Api.SendTransactionResponse> {
    throw new Error('Method sendTransaction is not implemented.');
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async requestAirdrop(
    address: string | Pick<Account, 'accountId'>,
    friendbotUrl?: string,
  ): Promise<Account> {
    throw new Error('Method requestAirdrop is not implemented.');
  }
}
