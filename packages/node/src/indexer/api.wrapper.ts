// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise } from '@polkadot/api';
import { ApiInterfaceEvents, ApiOptions } from '@polkadot/api/types';
import { BlockHash, RuntimeVersion } from '@polkadot/types/interfaces';
import algosdk from 'algosdk';
import { BlockContent } from './types';
import { AlgorandBlock, AlgorandApi } from './typesAlgo';

export class ApiWrapper {
  substrate: ApiPromise;
  algorand: AlgorandApi;
  query: any;
  consts: any;
  rpc: any;

  constructor(private network: string, private options: any | ApiOptions) {}

  async init(): Promise<void> {
    switch (this.network) {
      case 'algorand':
        this.algorand = {
          client: null,
          lastHeader: null,
        };
        this.algorand.client = new algosdk.Algodv2(
          this.options.token,
          this.options.server,
          this.options.port,
        );
        this.algorand.lastHeader = (
          await this.algorand.client
            .block((await this.algorand.client.status().do())['last-round'])
            .do()
        ).block;
        break;
      case 'polkadot':
        this.substrate = await ApiPromise.create(this.options);
        this.query = this.substrate.query;
        this.consts = this.substrate.consts;
        this.rpc = this.substrate.rpc;
        break;
      default:
        break;
    }
  }

  get genesisHash(): string {
    let genesisHash: string;
    switch (this.network) {
      case 'algorand':
        genesisHash = this.algorand.lastHeader.gh.toString('hex');
        break;
      case 'polkadot':
        genesisHash = this.substrate.genesisHash.toString();
        break;
      default:
        break;
    }
    return genesisHash;
  }

  get runtimeChain(): string {
    let runtimeChain: string;
    switch (this.network) {
      case 'algorand':
        runtimeChain = this.algorand.lastHeader.gen as string;
        break;
      case 'polkadot':
        runtimeChain = this.substrate.runtimeChain.toString();
        break;
      default:
        break;
    }
    return runtimeChain;
  }

  get specName(): string {
    let chainName: string;
    switch (this.network) {
      case 'algorand':
        chainName = 'algorand';
        break;
      case 'polkadot':
        chainName = this.substrate.runtimeVersion.specName.toString();
        break;
      default:
        break;
    }
    return chainName;
  }

  async disconnect(): Promise<void> {
    switch (this.network) {
      case 'algorand':
        break;
      case 'polkadot':
        await this.substrate.disconnect();
        break;
      default:
        break;
    }
  }

  on(eventName: string | ApiInterfaceEvents, callback: () => void): void {
    switch (this.network) {
      case 'algorand':
        break;
      case 'polkadot':
        this.substrate.on(eventName as ApiInterfaceEvents, callback);
        break;
      default:
        break;
    }
  }

  async getRuntimeVersion(parentBlockHash: BlockHash): Promise<RuntimeVersion> {
    let version: RuntimeVersion;
    switch (this.network) {
      case 'algorand':
        // RuntimeVersion doesn't make sense for Algorand
        break;
      case 'polkadot':
        version = (await this.substrate.rpc.state.getRuntimeVersion(
          parentBlockHash as BlockHash,
        )) as RuntimeVersion;
        break;
      default:
        break;
    }
    return version;
  }

  async getFinalizedBlockHeight(): Promise<number> {
    let finalizedBlockHeight: number;
    switch (this.network) {
      case 'algorand':
        finalizedBlockHeight = (await this.algorand.client.status().do())[
          'last-round'
        ];
        break;
      case 'polkadot':
        finalizedBlockHeight = (
          await this.substrate.rpc.chain.getBlock(
            await this.substrate.rpc.chain.getFinalizedHead(),
          )
        ).block.header.number.toNumber();
        break;
      default:
        break;
    }
    return finalizedBlockHeight;
  }

  async getLastHeight(): Promise<number> {
    let lastHeight: number;
    switch (this.network) {
      case 'algorand':
        lastHeight = (await this.algorand.client.status().do())['last-round'];
        break;
      case 'polkadot':
        lastHeight = (
          await this.substrate.rpc.chain.getHeader()
        ).number.toNumber();
        break;
      default:
        break;
    }
    return lastHeight;
  }

  async fetchBlocksArray(
    bufferBlocks: number[],
    fetchForPolkadot: (
      a: ApiPromise,
      b: number[],
      c: number,
    ) => Promise<BlockContent[]>,
    overallSpecVer?: number,
  ): Promise<AlgorandBlock | BlockContent[]> {
    switch (this.network) {
      case 'algorand':
        return Promise.all(
          bufferBlocks.map(
            async (round) =>
              (await this.algorand.client.block(round).do()).block,
          ),
        );
      case 'polkadot':
        return fetchForPolkadot(this.substrate, bufferBlocks, overallSpecVer);
      default:
        return null;
    }
  }
}
