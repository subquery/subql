// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { getLogger } from '@subql/node-core';
import {
  ApiWrapper,
  SorobanEvent,
  StellarBlock,
  StellarBlockWrapper,
  StellarEffect,
  StellarOperation,
  StellarTransaction,
} from '@subql/types-stellar';
import { cloneDeep } from 'lodash';
import { Server, ServerApi } from 'stellar-sdk/lib/horizon';
import { StellarBlockWrapped } from '../stellar/block.stellar';
import SafeStellarProvider from './safe-api';
import { SorobanServer } from './soroban.server';
import { StellarServer } from './stellar.server';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const logger = getLogger('api.Stellar');

export class StellarApi implements ApiWrapper<StellarBlockWrapper> {
  //private client: Server;
  private stellarClient: StellarServer;

  private chainId: string;
  private genesisHash: string;
  private name: string;

  constructor(
    private endpoint: string,
    private eventEmitter: EventEmitter2,
    private sorobanClient?: SorobanServer,
  ) {
    const { hostname, protocol, searchParams } = new URL(this.endpoint);

    const protocolStr = protocol.replace(':', '');

    logger.info(`Api host: ${hostname}, method: ${protocolStr}`);
    if (protocolStr === 'https' || protocolStr === 'http') {
      const options: Server.Options = {
        allowHttp: protocolStr === 'http',
      };

      this.stellarClient = new StellarServer(endpoint, options);
    } else {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  async init(): Promise<void> {
    //need archive node for genesis hash
    //const genesisLedger = (await this.stellarClient.ledgers().ledger(1).call()).records[0];
    this.chainId = (await this.stellarClient.getNetwork()).network_passphrase;
    //this.genesisHash = genesisLedger.hash;
  }

  async getFinalizedBlock(): Promise<ServerApi.LedgerRecord> {
    return (await this.stellarClient.ledgers().order('desc').call()).records[0];
  }

  async getFinalizedBlockHeight(): Promise<number> {
    return (await this.getFinalizedBlock()).sequence;
  }

  async getBestBlockHeight(): Promise<number> {
    return (await this.getFinalizedBlockHeight()) + 1;
  }

  getRuntimeChain(): string {
    return this.name;
  }

  getChainId(): string {
    return this.chainId;
  }

  getGenesisHash(): string {
    return this.chainId;
  }

  getSpecName(): string {
    return 'Stellar';
  }

  private async fetchTransactionsForLedger(
    sequence: number,
  ): Promise<ServerApi.TransactionRecord[]> {
    const txs: ServerApi.TransactionRecord[] = [];
    let txsPage = await this.api.transactions().forLedger(sequence).call();
    while (txsPage.records.length !== 0) {
      txs.push(...txsPage.records);
      txsPage = await txsPage.next();
    }

    return txs;
  }

  private async fetchOperationsForLedger(
    sequence: number,
  ): Promise<ServerApi.OperationRecord[]> {
    const operations: ServerApi.OperationRecord[] = [];
    let operationsPage = await this.api.operations().forLedger(sequence).call();
    while (operationsPage.records.length !== 0) {
      operations.push(...operationsPage.records);
      operationsPage = await operationsPage.next();
    }

    return operations;
  }

  private async fetchEffectsForLedger(
    sequence: number,
  ): Promise<ServerApi.EffectRecord[]> {
    const effects: ServerApi.EffectRecord[] = [];
    let effectsPage = await this.api.effects().forLedger(sequence).call();
    while (effectsPage.records.length !== 0) {
      effects.push(...effectsPage.records);
      effectsPage = await effectsPage.next();
    }

    return effects;
  }

  private getTransactionApplicationOrder(eventId: string) {
    // Right shift the ID by 12 bits to exclude the Operation Index
    const shiftedId = BigInt(eventId.split('-')[0]) >> BigInt(12);

    // Create a mask for 20 bits to ignore the Ledger Sequence Number
    const mask = BigInt((1 << 20) - 1);

    // Apply bitwise AND operation with the mask to get the Transaction Application Order
    const transactionApplicationOrder = shiftedId & mask;
    return Number(transactionApplicationOrder);
  }

  private getOperationIndex(id: string) {
    // Pick the first part of the ID before the '-' character
    const idPart = id.split('-')[0];

    // Create a mask for 12 bits to isolate the Operation Index
    const mask = BigInt((1 << 12) - 1);

    // Apply bitwise AND operation with the mask to get the Operation Index
    const operationIndex = BigInt(idPart) & mask;

    return Number(operationIndex);
  }

  async getAndWrapEvents(height: number): Promise<SorobanEvent[]> {
    const { events: events } = await this.sorobanClient.getEvents({
      startLedger: height,
      filters: [],
    });
    return events.map((event) => {
      const wrappedEvent = {
        ...event,
        ledger: null,
        transaction: null,
        operation: null,
      } as SorobanEvent;

      return wrappedEvent;
    });
  }

  private wrapEffectsForOperation(
    operationIndex: number,
    effectsForSequence: ServerApi.EffectRecord[],
  ): StellarEffect[] {
    return effectsForSequence
      .filter((effect) => this.getOperationIndex(effect.id) === operationIndex)
      .map((effect) => ({
        ...effect,
        ledger: null,
        transaction: null,
        operation: null,
      }));
  }

  private wrapOperationsForTx(
    transactionId: string,
    applicationOrder: number,
    sequence: number,
    operationsForSequence: ServerApi.OperationRecord[],
    effectsForSequence: ServerApi.EffectRecord[],
    eventsForSequence: SorobanEvent[],
  ): StellarOperation[] {
    const operations = operationsForSequence.filter(
      (op) => op.transaction_hash === transactionId,
    );

    return operations.map((op, index) => {
      const effects = this.wrapEffectsForOperation(index, effectsForSequence);

      const events = eventsForSequence.filter(
        (event) =>
          this.getTransactionApplicationOrder(event.id) === applicationOrder,
      );

      const wrappedOp: StellarOperation = {
        ...op,
        ledger: null,
        transaction: null,
        effects: [],
        events,
      };

      const clonedOp = cloneDeep(wrappedOp);

      effects.forEach((effect) => {
        effect.operation = clonedOp;
        wrappedOp.effects.push(effect);
      });

      return wrappedOp;
    });
  }

  private wrapTransactionsForLedger(
    sequence: number,
    transactions: ServerApi.TransactionRecord[],
    operationsForSequence: ServerApi.OperationRecord[],
    effectsForSequence: ServerApi.EffectRecord[],
    eventsForSequence: SorobanEvent[],
  ): StellarTransaction[] {
    return transactions.map((tx, index) => {
      const wrappedTx: StellarTransaction = {
        ...tx,
        ledger: null,
        operations: [] as StellarOperation[],
        effects: [] as StellarEffect[],
        events: [] as SorobanEvent[],
      };

      const clonedTx = cloneDeep(wrappedTx);
      const operations = this.wrapOperationsForTx(
        // TODO, this include other attribute from HorizonApi.TransactionResponse, but type assertion incorrect
        // TransactionRecord extends Omit<HorizonApi.TransactionResponse, "created_at">
        (tx as any).id,
        index + 1,
        sequence,
        operationsForSequence,
        effectsForSequence,
        eventsForSequence,
      ).map((op) => {
        op.transaction = clonedTx;
        op.effects = op.effects.map((effect) => {
          effect.transaction = clonedTx;
          return effect;
        });
        op.events = op.events.map((event) => {
          event.transaction = clonedTx;
          return event;
        });
        return op;
      });

      wrappedTx.operations.push(...operations);
      operations.forEach((op) => {
        wrappedTx.effects.push(...op.effects);
        wrappedTx.events.push(...op.events);
      });

      return wrappedTx;
    });
  }

  private async fetchAndWrapLedger(
    sequence: number,
  ): Promise<StellarBlockWrapper> {
    const [ledger, transactions, operations, effects] = await Promise.all([
      this.api.ledgers().ledger(sequence).call(),
      this.fetchTransactionsForLedger(sequence),
      this.fetchOperationsForLedger(sequence),
      this.fetchEffectsForLedger(sequence),
    ]);

    let eventsForSequence: SorobanEvent[] = [];

    //check if there is InvokeHostFunctionOp operation
    //If yes then, there are soroban transactions and we should we fetch soroban events
    const hasInvokeHostFunctionOp = operations.some(
      (op) => op.type.toString() === 'invoke_host_function',
    );

    if (this.sorobanClient && hasInvokeHostFunctionOp) {
      try {
        eventsForSequence = await this.getAndWrapEvents(sequence);
      } catch (e) {
        if (e.message === 'start is after newest ledger') {
          const latestLedger = (await this.sorobanClient.getLatestLedger())
            .sequence;
          throw new Error(`The requested events for ledger number ${sequence} is not available on the current soroban node.
                This is because you're trying to access a ledger that is after the latest ledger number ${latestLedger} stored in this node.
                To resolve this issue, please check you endpoint node start height`);
        }

        if (e.message === 'start is before oldest ledger') {
          throw new Error(`The requested events for ledger number ${sequence} is not available on the current soroban node.
                This is because you're trying to access a ledger that is older than the oldest ledger stored in this node.
                To resolve this issue, you can either:
                1. Increase the start ledger to a more recent one, or
                2. Connect to a different node that might have a longer history of ledgers.`);
        }

        throw e;
      }
    }

    const wrappedLedger: StellarBlock = {
      ...(ledger as unknown as ServerApi.LedgerRecord),
      transactions: [] as StellarTransaction[],
      operations: [] as StellarOperation[],
      effects: [] as StellarEffect[],
      events: eventsForSequence,
    };

    const wrapperTxs = this.wrapTransactionsForLedger(
      sequence,
      transactions,
      operations,
      effects,
      eventsForSequence,
    );

    const clonedLedger = cloneDeep(wrappedLedger);

    wrapperTxs.forEach((tx) => {
      tx.ledger = clonedLedger;
      tx.operations = tx.operations.map((op) => {
        op.ledger = clonedLedger;
        op.effects = op.effects.map((effect) => {
          effect.ledger = clonedLedger;
          return effect;
        });
        op.events = op.events.map((event) => {
          event.ledger = clonedLedger;
          return event;
        });
        return op;
      });

      wrappedLedger.transactions.push(tx);
      wrappedLedger.operations.push(...tx.operations);

      tx.operations.forEach((op) => {
        wrappedLedger.effects.push(...op.effects);
      });
    });

    const wrappedLedgerInstance = new StellarBlockWrapped(
      wrappedLedger,
      wrappedLedger.transactions,
      wrappedLedger.operations,
      wrappedLedger.effects,
      wrappedLedger.events,
    );

    return wrappedLedgerInstance;
  }

  async fetchBlocks(bufferBlocks: number[]): Promise<StellarBlockWrapper[]> {
    const ledgers = await Promise.all(
      bufferBlocks.map((sequence) => this.fetchAndWrapLedger(sequence)),
    );
    return ledgers;
  }

  get api(): Server {
    return this.stellarClient;
  }

  getSafeApi(blockHeight: number): SafeStellarProvider {
    //safe api not implemented yet
    return new SafeStellarProvider(null, blockHeight);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async connect(): Promise<void> {
    logger.error('Stellar API connect is not implemented');
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async disconnect(): Promise<void> {
    logger.error('Stellar API disconnect is not implemented');
    throw new Error('Not implemented');
  }

  handleError(e: Error, height: number): Error {
    if (e.message === 'start is before oldest ledger') {
      return new Error(`The requested ledger number ${height} is not available on the current blockchain node.
      This is because you're trying to access a ledger that is older than the oldest ledger stored in this node.
      To resolve this issue, you can either:
      1. Increase the start ledger to a more recent one, or
      2. Connect to a different node that might have a longer history of ledgers.`);
    }

    return e;
  }
}
