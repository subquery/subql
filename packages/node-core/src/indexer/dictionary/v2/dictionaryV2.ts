// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {IBlock} from '@subql/types-core';
import axios, {AxiosInstance} from 'axios';
import {DictionaryResponse, DictionaryVersion} from '..';
import {NodeConfig} from '../../../configure';
import {BlockHeightMap} from '../../../utils/blockHeightMap';
import {CoreDictionary} from '../coreDictionary';
import {DictionaryV2Metadata, DictionaryV2QueryEntry} from './types';

const FAT_META_QUERY_METHOD = `subql_filterBlocksCapabilities`;

export async function subqlFilterBlocksCapabilities(
  endpoint: string,
  axiosInstance?: AxiosInstance
): Promise<DictionaryV2Metadata> {
  if (!axiosInstance) {
    axiosInstance = axios.create({
      baseURL: endpoint,
    });
  }

  const requestData = {
    jsonrpc: '2.0',
    method: FAT_META_QUERY_METHOD,
    id: 1,
  };
  try {
    const response = await axiosInstance.post(endpoint, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const metadata: DictionaryV2Metadata = {
      chain: '1', //TODO, need chain for v2 meta
      start: response.data.result.availableBlocks[0].startHeight,
      end: response.data.result.availableBlocks[0].endHeight,
      genesisHash: response.data.result.genesisHash,
      filters: response.data.result.filters,
      supported: response.data.result.supportedResponses,
    };
    return metadata;
  } catch (error) {
    // Handle the error as needed
    throw new Error(`Dictionary v2 get capacity failed ${error}`);
  }
}

export abstract class DictionaryV2<
  FB,
  DS,
  QE extends DictionaryV2QueryEntry = DictionaryV2QueryEntry
> extends CoreDictionary<DS, FB> {
  queriesMap?: BlockHeightMap<QE>;
  protected _metadata: DictionaryV2Metadata | undefined;
  protected dictionaryApi: AxiosInstance;

  constructor(
    readonly dictionaryEndpoint: string,
    protected chainId: string,
    protected readonly nodeConfig: NodeConfig,
    protected readonly eventEmitter: EventEmitter2
  ) {
    super(dictionaryEndpoint, chainId, nodeConfig, eventEmitter);
    this.dictionaryApi = axios.create({
      baseURL: dictionaryEndpoint,
    });
    this._dictionaryVersion = DictionaryVersion.v2Complete;
  }

  protected abstract buildDictionaryQueryEntries(dataSources: DS[]): DictionaryV2QueryEntry;

  async init(): Promise<void> {
    this._metadata = await subqlFilterBlocksCapabilities(this.dictionaryEndpoint);
    this.setDictionaryStartHeight(this._metadata.start);
  }

  protected get metadata(): DictionaryV2Metadata {
    if (!this._metadata) {
      throw new Error(`DictionaryV2 hasn't been initialized`);
    }
    return this._metadata;
  }

  getQueryEndBlock(startBlockHeight: number, apiFinalizedHeight: number): number {
    return Math.min(startBlockHeight + this.nodeConfig.dictionaryQuerySize, this.metadata.end);
  }

  abstract getData(
    startBlock: number,
    queryEndBlock: number,
    limit: number
  ): Promise<DictionaryResponse<IBlock<FB>> | undefined>;

  queryMapValidByHeight(height: number): boolean {
    // we can not use map.has method here, has method only return true when value for corresponding key is set
    // but in BlockHeightMap it need to return any map <= key value, see `getDetails` method
    return !!this.queriesMap?.get(height);
  }

  protected dictionaryValidation(metaData?: DictionaryV2Metadata, startBlockHeight?: number): boolean {
    if (metaData === undefined || startBlockHeight === undefined) {
      return false;
    }
    this.metadataValid =
      this.validateChainMeta(metaData) &&
      startBlockHeight >= this.metadata.start &&
      startBlockHeight < this.metadata.end;
    return this.metadataValid;
  }
}
