// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {IBlock} from '@subql/types-core';
import axios, {AxiosInstance} from 'axios';
import {NodeConfig} from '../../../configure';
import {timeout} from '../../../utils';
import {CoreDictionary} from '../coreDictionary';
import {DictionaryResponse} from '../types';
import {DictionaryV2Metadata, DictionaryV2QueryEntry} from './types';

const FAT_META_QUERY_METHOD = `subql_filterBlocksCapabilities`;

type DictionaryV2Capabilities = {
  genesisHash: string;
  availableBlocks: {startHeight: number; endHeight: number}[];
  supportedResponses: ('basic' | 'complete')[];
  filters: any[]; // TODO
};

async function subqlFilterBlocksCapabilities(
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
    const response = await axiosInstance.post<{
      result?: DictionaryV2Capabilities;
      error?: {code: number; message: string};
    }>(endpoint, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status >= 400) {
      // TODO provide better error
      throw new Error('Invalid response');
    }

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    const {result} = response.data;

    if (!result) {
      throw new Error('Malformed response');
    }

    const metadata: DictionaryV2Metadata = {
      chain: '1', //TODO, need chain for v2 meta
      start: result.availableBlocks[0].startHeight,
      end: result.availableBlocks[0].endHeight,
      genesisHash: result.genesisHash,
      filters: result.filters,
      supported: result.supportedResponses,
    };
    return metadata;
  } catch (error) {
    // Handle the error as needed
    throw new Error(`Dictionary v2 get capability failed ${error}`);
  }
}

export abstract class DictionaryV2<
  FB,
  DS,
  QE extends DictionaryV2QueryEntry = DictionaryV2QueryEntry
> extends CoreDictionary<DS, FB, DictionaryV2Metadata, QE> {
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
  }

  static async isDictionaryV2(endpoint: string, timeoutSec = 1): Promise<boolean> {
    let resp: DictionaryV2Metadata;
    const timeoutMsg = 'Inspect dictionary version timeout';
    try {
      resp = await timeout(subqlFilterBlocksCapabilities(endpoint), timeoutSec, timeoutMsg);
      return resp.supported.includes('complete') || resp.supported.includes('basic');
    } catch (e: any) {
      // TODO does it make sense to log here?
      return false;
    }
  }

  protected abstract buildDictionaryQueryEntries(dataSources: DS[]): QE;

  async init(): Promise<void> {
    this._metadata = await subqlFilterBlocksCapabilities(this.dictionaryEndpoint);
    this.setDictionaryStartHeight(this._metadata.start);
  }

  getQueryEndBlock(targetBlockHeight: number, apiFinalizedHeight: number): number {
    return Math.min(targetBlockHeight, this.metadata.end);
  }

  abstract getData(
    startBlock: number,
    queryEndBlock: number,
    limit: number
  ): Promise<DictionaryResponse<IBlock<FB> | number> | undefined>;

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
