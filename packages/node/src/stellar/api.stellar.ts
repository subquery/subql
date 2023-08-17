// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { getLogger } from '@subql/node-core';
import {
  ApiWrapper,
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

  constructor(private endpoint: string, private eventEmitter: EventEmitter2) {
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

  /*
  async getEvents(height: number): Promise<StellarRpc.GetEventsResponse> {
    return this.client.getEvents({ startLedger: height, filters: [] });
  }
  */

  private async fetchEffectsForOperation(
    operationId: string,
  ): Promise<StellarEffect[]> {
    const effects = (await this.api.effects().forOperation(operationId).call())
      .records;
    return effects.map((effect) => ({
      ...effect,
      ledger: null,
      transaction: null,
      operation: null,
    }));
  }

  private async fetchOperationsForTransaction(
    transactionId: string,
  ): Promise<StellarOperation[]> {
    const operations = (
      await this.api.operations().forTransaction(transactionId).call()
    ).records;

    return Promise.all(
      operations.map(async (op) => {
        const wrappedOp: StellarOperation = {
          ...op,
          ledger: null,
          transaction: null,
          effects: [] as StellarEffect[],
        };

        const effects = (await this.fetchEffectsForOperation(op.id)).map(
          (effect) => {
            effect.operation = cloneDeep(wrappedOp);
            return effect;
          },
        );

        wrappedOp.effects.push(...effects);

        return wrappedOp;
      }),
    );
  }

  private async fetchTransactionsForLedger(
    sequence: number,
  ): Promise<StellarTransaction[]> {
    const transactions = (
      await this.api.transactions().forLedger(sequence).call()
    ).records;

    return Promise.all(
      transactions.map(async (tx) => {
        let account: ServerApi.AccountRecord;
        try {
          account = await tx.account();
        } catch (e) {
          if ((e as Error).name === 'NotFoundError') {
            account = null;
          } else {
            throw e;
          }
        }

        const wrappedTx: StellarTransaction = {
          ...tx,
          ledger: null,
          account: account,
          operations: [] as StellarOperation[],
          effects: [] as StellarEffect[],
        };

        const operations = (
          await this.fetchOperationsForTransaction(tx.id)
        ).map((op) => {
          op.transaction = cloneDeep(wrappedTx);
          op.effects = op.effects.map((effect) => {
            effect.transaction = cloneDeep(wrappedTx);
            return effect;
          });
          return op;
        });

        wrappedTx.operations.push(...operations);
        operations.forEach((op) => {
          wrappedTx.effects.push(...op.effects);
        });

        return wrappedTx;
      }),
    );
  }

  private async fetchAndWrapLedger(sequence: number): Promise<StellarBlock> {
    const ledger = (await this.api
      .ledgers()
      .ledger(sequence)
      .call()) as unknown as ServerApi.LedgerRecord;

    const wrappedLedger: StellarBlock = {
      ...ledger,
      transactions: [] as StellarTransaction[],
      operations: [] as StellarOperation[],
      effects: [] as StellarEffect[],
    };

    const transactions = (await this.fetchTransactionsForLedger(sequence)).map(
      (tx) => {
        tx.ledger = cloneDeep(wrappedLedger);
        tx.operations = tx.operations.map((op) => {
          op.ledger = cloneDeep(wrappedLedger);
          op.effects = op.effects.map((effect) => {
            effect.ledger = cloneDeep(wrappedLedger);
            return effect;
          });
          return op;
        });
        return tx;
      },
    );

    transactions.forEach((tx) => {
      wrappedLedger.transactions.push(tx);
      wrappedLedger.operations.push(...tx.operations);
      tx.operations.forEach((op) => wrappedLedger.effects.push(...op.effects));
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
