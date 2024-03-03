// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {IBlock} from '@subql/types-core';
import axios, {AxiosInstance} from 'axios';
import {utils} from 'ethers';
import {getBlockHeight} from '../';
import {NodeConfig} from '../../../configure';
import {getLogger} from '../../../logger';
import {timeout} from '../../../utils';
import {CoreDictionary} from '../coreDictionary';
import {DictionaryResponse} from '../types';
import {DictionaryV2Metadata, DictionaryV2QueryEntry, V2MetadataFilters, RawFatDictionaryResponseData} from './types';

const MIN_FAT_FETCH_LIMIT = 200;
const FAT_BLOCKS_QUERY_METHOD = `subql_filterBlocks`;
const FAT_META_QUERY_METHOD = `subql_filterBlocksCapabilities`;
const logger = getLogger('dictionary v2');

type DictionaryV2Capabilities = {
  genesisHash: string;
  availableBlocks: {startHeight: number; endHeight: number}[];
  supportedResponses: ('basic' | 'complete')[];
  filters: V2MetadataFilters;
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

  protected abstract convertResponseBlocks<RFB>(
    result: RawFatDictionaryResponseData<RFB>
  ): DictionaryResponse<IBlock<FB>> | undefined;

 async getData<RFB>(
    startBlock: number,
    queryEndBlock: number,
    limit: number = MIN_FAT_FETCH_LIMIT
  ): Promise<DictionaryResponse<IBlock<FB> | number> | undefined> {
    const queryDetails = this.queriesMap?.getDetails(startBlock);
    const conditions = queryDetails?.value;

    if (!conditions) {
      return undefined;
    }

    const requestData = {
      jsonrpc: '2.0',
      method: FAT_BLOCKS_QUERY_METHOD,
      id: 1,
      params: [
        {
          fromBlock: utils.hexValue(startBlock),
          toBlock: utils.hexValue(queryEndBlock),
          limit: utils.hexValue(limit),
          blockFilter: conditions,
          fieldSelector: {
            blockHeader: true,
            logs: {transaction: true},
            transactions: {log: true},
          },
        },
      ],
    };
    try {
      const response = await this.dictionaryApi.post<{
        result?: RawFatDictionaryResponseData<RFB>;
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
      this.metadata.end = response.data.result.BlockRange[1];
      logger.debug(
        'NUM DICT RESULTS',
        result?.batchBlocks.map((b) => getBlockHeight(b))
      );
      return result;
    } catch (error: any) {
      logger.error(error, `Dictionary query failed. request: ${JSON.stringify(requestData, null, 2)}`);
      // Handle the error as needed
      throw new Error(`Fat dictionary get capability failed ${error}`);
    }
  }

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
