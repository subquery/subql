// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise } from '@polkadot/api';
import { ApiInterfaceEvents, ApiOptions } from '@polkadot/api/types';
import {
  BlockHash,
  SignedBlock,
  RuntimeVersion,
  Header as SubstrateHeader,
} from '@polkadot/types/interfaces';
import AlgorandHeader from 'algosdk/dist/types/src/types/blockHeader';
import algosdk from "algosdk";

type Header = SubstrateHeader | AlgorandHeader;

export class ApiWrapper {
  client: ApiPromise;
  clientAlgo: algosdk.Algodv2;
  query: any;
  consts: any;
  rpc: any;

  constructor(private network: string, private options: any | ApiOptions) { }

  async init(): Promise<void> {
    switch (this.network) {
      case 'algorand':
        this.clientAlgo = new algosdk.Algodv2(
          this.options.token,
          this.options.server,
          this.options.port,
        );
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
    switch (this.network) {
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
    switch (this.network) {
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
    switch (this.network) {
      case 'algorand':
        runtimeVersion = {
          specName: 'algorand',
        };
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
    switch (this.network) {
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
    switch (this.network) {
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
    switch (this.network) {
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

  async getFinalizedBlockHeight(): Promise<number> {
    let finalizedBlockHeight: number;
    let finalizedHead;
    let finalizedBlock;
    switch (this.network) {
      case 'algorand':
        finalizedBlockHeight = await this.getLastHeight();
        break;
      case 'polkadot':
        finalizedHead = await this.getFinalizedHead();
        finalizedBlock = await this.getBlock(finalizedHead);
        finalizedBlockHeight = finalizedBlock.block.header.number.toNumber();
        break;
      default:
        break;
    }
    return finalizedBlockHeight;
  }

  async getFinalizedHead(): Promise<string | BlockHash | number> {
    let finalizedHead: string | BlockHash | number;
    switch (this.network) {
      case 'algorand':
        finalizedHead = await this.getLastHeight();
        break;
      case 'polkadot':
        finalizedHead = await this.client.rpc.chain.getFinalizedHead();
        break;
      default:
        break;
    }
    return finalizedHead;
  }

  async getBlock(
    blockHash: string | BlockHash | number,
  ): Promise<any | SignedBlock> {
    let block: any | SignedBlock;
    switch (this.network) {
      case 'algorand':
        block = await this.clientAlgo.block(blockHash as number).do();
        break;
      case 'polkadot':
        block = await this.client.rpc.chain.getBlock(blockHash as BlockHash);
        break;
      default:
        break;
    }
    return block;
  }

  async getLastHeight(): Promise<number> {
    let lastHeight: any | Header;
    switch (this.network) {
      case 'algorand':
        lastHeight = (await this.clientAlgo.status().do())['last-round'];
        break;
      case 'polkadot':
        lastHeight = (
          await this.client.rpc.chain.getHeader()
        ).number.toNumber();
        break;
      default:
        break;
    }
    return lastHeight;
  }
  async getHeader(): Promise<any | Header> {
    let header: any | Header;
    const objAlgo: any = {};
    switch (this.network) {
      case 'algorand':
        objAlgo.status = await this.clientAlgo.status().do();
        objAlgo.round = objAlgo.status['last-round'];
        objAlgo.ret = await this.clientAlgo.block(objAlgo.round).do();
        header = objAlgo.ret.block;
        delete header.txns;
        break;
      case 'polkadot':
        header = new GenericHeader(
          await this.client.rpc.chain.getHeader(),
          this.network,
        );
        break;
      default:
        break;
    }
    return header;
  }

  async getBlockHash(height: number): Promise<any | BlockHash> {
    let blockHash: any | BlockHash;
    switch (this.network) {
      case 'algorand':
        blockHash = (await this.clientAlgo.block(height + 1).do()).block.prev;
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
    switch (this.network) {
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
    switch (this.network) {
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
    switch (this.network) {
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

class GenericHeader {
  private network: string;
  private inner: any;

  constructor(header: Header, network: string) {
    this.network = network;
    this.inner = header as any;
  }

  number() {
    switch (this.network) {
      case 'algorand':
        return this.inner.rnd;
      case 'polkadot':
        return this.inner.number.toNumber();
      default:
        return -1;
    }
  }
}
