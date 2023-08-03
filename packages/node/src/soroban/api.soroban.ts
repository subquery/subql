// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { getLogger } from '@subql/node-core';
import {
  ApiWrapper,
  SorobanBlock,
  SorobanBlockWrapper,
} from '@subql/types-soroban';
import { Server, SorobanRpc, scValToNative, xdr } from 'soroban-client';
import { SorobanBlockWrapped } from './block.soroban';
import SafeSorobanProvider from './safe-api';
import { SorobanServer } from './soroban.server';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const logger = getLogger('api.Soroban');

export class SorobanApi implements ApiWrapper<SorobanBlockWrapper> {
  private client: Server;

  private chainId: string;
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
      this.client = new SorobanServer(endpoint, options);
    } else {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  async init(): Promise<void> {
    const network = await this.client.getNetwork();
    this.chainId = network.passphrase;
  }

  async getFinalizedBlock(): Promise<SorobanRpc.GetLatestLedgerResponse> {
    return this.client.getLatestLedger();
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
    return this.getChainId();
  }

  getSpecName(): string {
    return 'Soroban';
  }

  async getEvents(height: number): Promise<SorobanRpc.GetEventsResponse> {
    return this.client.getEvents({ startLedger: height, filters: [] });
  }

  async fetchBlock(
    blockNumber: number,
    includeTx?: boolean,
  ): Promise<SorobanBlockWrapped> {
    try {
      const rawEvents = (await this.getEvents(blockNumber)).events;

      const events = rawEvents.map((event) => ({
        ...event,
        value: {
          ...event.value,
          get decoded() {
            return scValToNative(xdr.ScVal.fromXDR(event.value.xdr, 'base64'));
          },
        },
        topic: event.topic.map((topic) =>
          SorobanBlockWrapped.decodeScVals(xdr.ScVal.fromXDR(topic, 'base64')),
        ),
      }));

      const ret = new SorobanBlockWrapped(events, {
        ledger: blockNumber,
        hash: blockNumber.toString(),
      } as SorobanBlock);

      this.eventEmitter.emit('fetchBlock');
      return ret;
    } catch (e) {
      throw this.handleError(e, blockNumber);
    }
  }

  async fetchBlocks(bufferBlocks: number[]): Promise<SorobanBlockWrapper[]> {
    return Promise.all(
      bufferBlocks.map(async (num) => this.fetchBlock(num, true)),
    );
  }

  get api(): Server {
    return this.client;
  }

  getSafeApi(blockHeight: number): SafeSorobanProvider {
    return new SafeSorobanProvider(this.client, blockHeight);
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
