// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {numberToHex} from '@subql/utils';
import axios, {AxiosInstance} from 'axios';
import {FieldSelector} from '../';
import {NodeConfig} from '../../../configure';
import {getLogger} from '../../../logger';
import {IBlock} from '../../types';
import {CoreDictionary} from '../coreDictionary';
import {DictionaryResponse} from '../types';
import {DictionaryV2Metadata, DictionaryV2QueryEntry, V2MetadataFilters, RawDictionaryResponseData} from './types';

const MIN_FETCH_LIMIT = 200;
const BLOCKS_QUERY_METHOD = `subql_filterBlocks`;
const META_QUERY_METHOD = `subql_filterBlocksCapabilities`;
const logger = getLogger('dictionary v2');

type DictionaryV2Capabilities = {
  genesisHash: string;
  availableBlocks: {startHeight: number; endHeight: number}[];
  supportedResponses: ('basic' | 'complete')[];
  filters: V2MetadataFilters;
  chainId: string;
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
    method: META_QUERY_METHOD,
    id: 1,
  };

  const response = await axiosInstance.post<{
    result?: DictionaryV2Capabilities;
    error?: {code: number; message: string};
  }>(endpoint, requestData, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.status >= 400) {
    throw new Error(`[${response.status}]: ${response.statusText}`);
  }

  if (response.data.error) {
    throw new Error(response.data.error.message);
  }

  const {result} = response.data;

  if (!result) {
    throw new Error('Malformed response');
  }

  const metadata: DictionaryV2Metadata = {
    start: result.availableBlocks[0].startHeight,
    end: result.availableBlocks[0].endHeight,
    genesisHash: result.genesisHash,
    filters: result.filters,
    supported: result.supportedResponses,
    chainId: result.chainId,
  };
  return metadata;
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
    super(chainId, nodeConfig, eventEmitter);
    this.dictionaryApi = axios.create({
      baseURL: dictionaryEndpoint,
    });
  }

  protected abstract buildDictionaryQueryEntries(dataSources: DS[]): QE;

  protected async init(): Promise<void> {
    this._metadata = await subqlFilterBlocksCapabilities(this.dictionaryEndpoint);
    this.setDictionaryStartHeight(this._metadata.start);
  }

  getQueryEndBlock(targetBlockHeight: number, apiFinalizedHeight: number): number {
    return Math.min(targetBlockHeight, this.metadata.end);
  }

  protected abstract convertResponseBlocks<RFB>(
    result: RawDictionaryResponseData<RFB>
  ): DictionaryResponse<IBlock<FB>> | undefined;

  async getData<RFB>(
    startBlock: number,
    endBlock: number,
    limit: number = MIN_FETCH_LIMIT,
    fieldSelector: FieldSelector
  ): Promise<DictionaryResponse<IBlock<FB> | number> | undefined> {
    const {conditions, queryEndBlock} = this.getQueryConditions(startBlock, endBlock);
    if (!conditions) {
      return undefined;
    }
    const requestData = {
      jsonrpc: '2.0',
      method: BLOCKS_QUERY_METHOD,
      id: 1,
      params: [
        {
          fromBlock: numberToHex(startBlock),
          toBlock: numberToHex(queryEndBlock),
          limit: numberToHex(limit),
          blockFilter: conditions,
          fieldSelector,
        },
      ],
    };
    try {
      const response = await this.dictionaryApi.post<{
        result?: RawDictionaryResponseData<RFB>;
        error?: {code: number; message: string};
      }>(this.dictionaryEndpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.result) {
        return undefined;
      }
      const result = this.convertResponseBlocks(response.data.result);
      if (result && result?.lastBufferedHeight === undefined) {
        result.lastBufferedHeight = Math.min(endBlock, queryEndBlock);
      }
      this.metadata.end = response.data.result.BlockRange[1];
      return result;
    } catch (error: any) {
      logger.error(error, `Dictionary query failed. request: ${JSON.stringify(requestData, null, 2)}`);
      // Handle the error as needed
      throw new Error(`Dictionary get capability failed ${error}`);
    }
  }

  queryMapValidByHeight(height: number): boolean {
    // we can not use map.has method here, has method only return true when value for corresponding key is set
    // but in BlockHeightMap it need to return any map <= key value, see `getDetails` method
    try {
      return !!this.queriesMap?.get(height);
    } catch (e) {
      return false;
    }
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

  protected validateChainMeta(metaData: DictionaryV2Metadata): boolean {
    return metaData.genesisHash === this.chainId || metaData.chainId === this.chainId;
  }
}
