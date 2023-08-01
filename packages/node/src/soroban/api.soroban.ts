// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { getLogger } from '@subql/node-core';
import { ApiWrapper, SorobanBlockWrapper } from '@subql/types-soroban';
import { ServerApi, Server } from 'stellar-sdk';
import * as StellarUtils from '../utils/stellar';
import SafeSorobanProvider from './safe-api';
import { StellarServer } from './stellar.server';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const logger = getLogger('api.Soroban');

export class SorobanApi implements ApiWrapper<SorobanBlockWrapper> {
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
    return 'Soroban';
  }

  /*
  async getEvents(height: number): Promise<SorobanRpc.GetEventsResponse> {
    return this.client.getEvents({ startLedger: height, filters: [] });
  }
  */

  async fetchBlocks(bufferBlocks: number[]): Promise<SorobanBlockWrapper[]> {
    return StellarUtils.fetchBlockBatches(bufferBlocks, this.stellarClient);
  }

  get api(): Server {
    return this.stellarClient;
  }

  getSafeApi(blockHeight: number): SafeSorobanProvider {
    //safe api not implemented yet
    return new SafeSorobanProvider(null, blockHeight);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async connect(): Promise<void> {
    logger.error('Soroban API connect is not implemented');
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async disconnect(): Promise<void> {
    logger.error('Soroban API disconnect is not implemented');
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
