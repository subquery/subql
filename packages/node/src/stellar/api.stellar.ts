// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
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
import { Server, ServerApi } from 'stellar-sdk';
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
    const { hostname, protocol, searchParams } = new URL(endpoint);

    const protocolStr = protocol.replace(':', '');

    logger.info(`Api host: ${hostname}, method: ${protocolStr}`);
    if (protocolStr === 'https' || protocolStr === 'http') {
      const options: Server.Options = {
        //headers: {
        //  'User-Agent': `Subquery-Node ${packageVersion}`,
        //},
        allowHttp: protocolStr === 'http',
      };
      //searchParams.forEach((value, name, searchParams) => {
      //  (connection.headers as any)[name] = value;
      //});
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

  private getTransactionApplicationOrder(eventId: string) {
    // Right shift the ID by 12 bits to exclude the Operation Index
    const shiftedId = BigInt(eventId.split('-')[0]) >> BigInt(12);

    // Create a mask for 20 bits to ignore the Ledger Sequence Number
    const mask = BigInt((1 << 20) - 1);

    // Apply bitwise AND operation with the mask to get the Transaction Application Order
    const transactionApplicationOrder = shiftedId & mask;
    return Number(transactionApplicationOrder);
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

  private async fetchEffectsForOperation(
    operationId: string,
  ): Promise<StellarEffect[]> {
    const { records: effects } = await this.api
      .effects()
      .forOperation(operationId)
      .call();
    return effects.map((effect) => ({
      ...effect,
      ledger: null,
      transaction: null,
      operation: null,
    }));
  }

  private async fetchOperationsForTransaction(
    transactionId: string,
    applicationOrder: number,
    sequence: number,
  ): Promise<StellarOperation[]> {
    const { records: operations } = await this.api
      .operations()
      .forTransaction(transactionId)
      .call();

    let sequenceEvents: SorobanEvent[] = [];

    const hasInvokeHostFunctionOp = operations.some(
      (op) => op.type.toString() === 'invoke_host_function',
    );

    if (this.sorobanClient && hasInvokeHostFunctionOp) {
      try {
        sequenceEvents = await this.getAndWrapEvents(sequence);
      } catch (e) {
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

    return Promise.all(
      operations.map(async (op) => {
        const effects = await this.fetchEffectsForOperation(op.id);

        const events = sequenceEvents.filter(
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

        effects.forEach((effect) => {
          effect.operation = cloneDeep(wrappedOp);
          wrappedOp.effects.push(effect);
        });

        return wrappedOp;
      }),
    );
  }

  private async fetchTransactionsForLedger(
    sequence: number,
  ): Promise<StellarTransaction[]> {
    const { records: transactions } = await this.api
      .transactions()
      .forLedger(sequence)
      .call();

    return Promise.all(
      transactions.map(async (tx, index) => {
        const wrappedTx: StellarTransaction = {
          ...tx,
          ledger: null,
          operations: [] as StellarOperation[],
          effects: [] as StellarEffect[],
          events: [] as SorobanEvent[],
        };

        const operations = (
          await this.fetchOperationsForTransaction(tx.id, index + 1, sequence)
        ).map((op) => {
          op.transaction = cloneDeep(wrappedTx);
          op.effects = op.effects.map((effect) => {
            effect.transaction = cloneDeep(wrappedTx);
            return effect;
          });
          op.events = op.events.map((event) => {
            event.transaction = cloneDeep(wrappedTx);
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
      }),
    );
  }

  private async fetchAndWrapLedger(sequence: number): Promise<StellarBlock> {
    const [ledger, transactions] = await Promise.all([
      this.api.ledgers().ledger(sequence).call(),
      this.fetchTransactionsForLedger(sequence),
    ]);

    const wrappedLedger: StellarBlock = {
      ...(ledger as unknown as ServerApi.LedgerRecord),
      transactions: [] as StellarTransaction[],
      operations: [] as StellarOperation[],
      effects: [] as StellarEffect[],
      events: [] as SorobanEvent[],
    };

    transactions.forEach((tx) => {
      tx.ledger = cloneDeep(wrappedLedger);
      tx.operations = tx.operations.map((op) => {
        op.ledger = cloneDeep(wrappedLedger);
        op.effects = op.effects.map((effect) => {
          effect.ledger = cloneDeep(wrappedLedger);
          return effect;
        });
        op.events = op.events.map((event) => {
          event.ledger = cloneDeep(wrappedLedger);
          return event;
        });
        return op;
      });

      wrappedLedger.transactions.push(tx);
      wrappedLedger.operations.push(...tx.operations);

      tx.operations.forEach((op) => {
        wrappedLedger.effects.push(...op.effects);
        wrappedLedger.events.push(...op.events);
      });
    });

    return wrappedLedger;
  }

  async fetchBlocks(bufferBlocks: number[]): Promise<StellarBlockWrapper[]> {
    const ledgers = await Promise.all(
      bufferBlocks.map((sequence) => this.fetchAndWrapLedger(sequence)),
    );
    return ledgers.map(
      (ledger) =>
        new StellarBlockWrapped(
          ledger,
          ledger.transactions,
          ledger.operations,
          ledger.effects,
          ledger.events,
        ),
    );
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
