// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise } from '@polkadot/api';
import { ApiInterfaceEvents, ApiOptions } from '@polkadot/api/types';
import {
  BlockHash,
  SignedBlock,
  RuntimeVersion,
  Header,
} from '@polkadot/types/interfaces';

export class ApiWrapper {
  client: ApiPromise; // algosdk.Algodv2 | ApiPromise;
  query: any;
  consts: any;
  rpc: any;

  constructor(private blockChain: string, private options: any | ApiOptions) {}

  async init(): Promise<void> {
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        this.client = await ApiPromise.create(this.options);
        this.query = this.client.query;
        this.consts = this.client.consts;
        this.rpc = this.client.rpc;
        break;
      default:
        break;
    }
  }

  get genesisHash(): string {
    let genesisHash: string;
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        genesisHash = this.client.genesisHash.toString();
        break;
      default:
        break;
    }
    return genesisHash;
  }

  get runtimeChain(): string {
    let runtimeChain: string;
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        runtimeChain = this.client.runtimeChain.toString();
        break;
      default:
        break;
    }
    return runtimeChain;
  }

  get runtimeVersion(): any {
    let runtimeVersion: any;
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        runtimeVersion = {
          specName: this.client.runtimeVersion.specName.toString(),
        };
        break;
      default:
        break;
    }
    return runtimeVersion;
  }

  async disconnect(): Promise<void> {
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        await this.client.disconnect();
        break;
      default:
        break;
    }
  }

  on(eventName: string | ApiInterfaceEvents, callback: () => void): void {
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        this.client.on(eventName as ApiInterfaceEvents, callback);
        break;
      default:
        break;
    }
  }

  async getRuntimeVersion(
    parentBlockHash: string | BlockHash,
  ): Promise<any | RuntimeVersion> {
    let version: any | RuntimeVersion;
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        version = (await this.client.rpc.state.getRuntimeVersion(
          parentBlockHash as BlockHash,
        )) as RuntimeVersion;
        break;
      default:
        break;
    }
    return version;
  }

  async getFinalizedHead(): Promise<string | BlockHash> {
    let finalizedHead: string | BlockHash;
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        finalizedHead = await this.client.rpc.chain.getFinalizedHead();
        break;
      default:
        break;
    }
    return finalizedHead;
  }

  async getBlock(blockHash: string | BlockHash): Promise<any | SignedBlock> {
    let block: any | SignedBlock;
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        block = await this.client.rpc.chain.getBlock(blockHash as BlockHash);
        break;
      default:
        break;
    }
    return block;
  }

  async getHeader(): Promise<any | Header> {
    let header: any | Header;
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        header = await this.client.rpc.chain.getHeader();
        break;
      default:
        break;
    }
    return header;
  }

  async getBlockHash(height: number): Promise<any | BlockHash> {
    let blockHash: any | BlockHash;
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        blockHash = await this.client.rpc.chain.getBlockHash(height);
        break;
      default:
        break;
    }
    return blockHash;
  }

  async getBlockRegistry(blockHash: string | BlockHash): Promise<void> {
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        await this.client.getBlockRegistry(blockHash as BlockHash);
        break;
      default:
        break;
    }
  }

  async at(blockHash: string | BlockHash): Promise<any> {
    let clientAt: any;
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        clientAt = await this.client.at(blockHash);
        break;
      default:
        break;
    }
    return clientAt;
  }

  getRegistryDefinition(type: string): any {
    let registryDefinition: any;
    switch (this.blockChain) {
      case 'algorand':
        break;
      case 'polkadot':
        registryDefinition = this.client.registry.getDefinition(type);
        break;
      default:
        break;
    }
    return registryDefinition;
  }
}
