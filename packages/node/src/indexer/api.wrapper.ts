// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise } from '@polkadot/api';
import { ApiInterfaceEvents, ApiOptions } from '@polkadot/api/types';
import {
  AlgorandClient,
  AlgorandLastHeader,
  AlgorandGenesisHash,
  AlgorandRuntimeChain,
  AlgorandGetFinalizedBlockHeight,
  AlgorandGetLastHeight,
} from './api.algorand';
import { BlockContent } from './types';
import { AlgorandBlock, AlgorandApi } from './typesAlgo';

export class ApiWrapper {
  substrate?: ApiPromise;
  algorand?: AlgorandApi;
  query?: any;
  consts?: any;
  rpc?: any;
  genesisHash: string;
  runtimeChain: string;
  specName: string;
  disconnect?: () => Promise<void>;
  on?: (type: ApiInterfaceEvents, handler: (...args: any[]) => any) => void;
  getFinalizedBlockHeight: () => Promise<number>;
  getLastHeight: () => Promise<number>;

  constructor(private network: string, private options: any | ApiOptions) {}

  async init(): Promise<void> {
    switch (this.network) {
      case 'algorand':
        this.algorand = {
          client: null,
          lastHeader: null,
        };
        this.algorand.client = AlgorandClient(
          this.options.token,
          this.options.server,
          this.options.port,
        );
        this.algorand.lastHeader = await AlgorandLastHeader(
          this.algorand.client,
        );
        this.genesisHash = AlgorandGenesisHash(this.algorand.lastHeader);
        this.runtimeChain = AlgorandRuntimeChain(this.algorand.lastHeader);
        this.specName = 'algorand';
        this.getFinalizedBlockHeight = async () =>
          AlgorandGetFinalizedBlockHeight(this.algorand.client);
        this.getLastHeight = async () =>
          AlgorandGetLastHeight(this.algorand.client);
        break;
      case 'polkadot':
        this.substrate = await ApiPromise.create(this.options);
        this.query = this.substrate.query;
        this.consts = this.substrate.consts;
        this.rpc = this.substrate.rpc;
        this.genesisHash = this.substrate.genesisHash.toString();
        this.runtimeChain = this.substrate.runtimeChain.toString();
        this.specName = this.substrate.runtimeVersion.specName.toString();
        this.disconnect = () => this.substrate.disconnect();
        this.on = (
          type: ApiInterfaceEvents,
          handler: (...args: any[]) => any,
        ) => this.substrate.on(type, handler);
        this.getFinalizedBlockHeight = async () => {
          const height = (
            await this.substrate.rpc.chain.getBlock(
              await this.substrate.rpc.chain.getFinalizedHead(),
            )
          ).block.header.number.toNumber();
          return height;
        };
        this.getLastHeight = async () => {
          const lastHeight = (
            await this.substrate.rpc.chain.getHeader()
          ).number.toNumber();
          return lastHeight;
        };
        break;
      default:
        break;
    }
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
