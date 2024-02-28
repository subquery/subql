// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {NETWORK_FAMILY} from '@subql/common';
import {IBlock} from '@subql/types-core';
import fetch from 'cross-fetch';
import {NodeConfig} from '../../configure';
import {getLogger} from '../../logger';
import {BlockHeightMap} from '../../utils/blockHeightMap';
import {DictionaryResponse, IDictionary, IDictionaryCtrl} from './types';

const logger = getLogger('DictionaryService');
export abstract class DictionaryService<DS, FB> implements IDictionaryCtrl<DS, FB>, OnApplicationShutdown {
  protected _dictionaries: IDictionary<DS, FB>[] = [];

  protected _currentDictionaryIndex: number | undefined;
  constructor(
    protected chainId: string,
    protected readonly nodeConfig: NodeConfig,
    protected readonly eventEmitter: EventEmitter2
  ) {}

  onApplicationShutdown(): void {
    this._dictionaries = [];
    this._currentDictionaryIndex = undefined;
  }

  abstract initDictionaries(): Promise<void>;

  init(dictionaries: IDictionary<DS, FB>[]): void {
    this._dictionaries = dictionaries;
  }

  private getDictionary(height: number, skipDictionaryIndex: Set<number> = new Set()): IDictionary<DS, FB> | undefined {
    if (this._dictionaries.length === 0) {
      logger.debug(`No dictionaries available to use`);
      return undefined;
    }
    // If current dictionary is valid, use current one instead of find a dictionary
    if (
      this._currentDictionaryIndex !== undefined &&
      !skipDictionaryIndex.has(this._currentDictionaryIndex) &&
      this._dictionaries[this._currentDictionaryIndex].heightValidation(height)
    ) {
      return this._dictionaries[this._currentDictionaryIndex];
    } else {
      this.findDictionary(height, skipDictionaryIndex);
      if (this._currentDictionaryIndex === undefined) {
        logger.warn(`No supported dictionary found`);
        return undefined;
      } else {
        logger.debug(`Updated : current dictionary Index is ${this._currentDictionaryIndex}`);
        return this._dictionaries[this._currentDictionaryIndex];
      }
    }
  }

  // Find the next valid dictionary
  private findDictionary(height: number, skipDictionaryIndex: Set<number>) {
    // DO NOT remove dictionary not valid
    // As they can be valid for different block range, or work for other query
    const index = this._dictionaries.findIndex(
      (d, index) => d.heightValidation(height) && !skipDictionaryIndex.has(index)
    );
    // If not find any, then still set undefined.
    this._currentDictionaryIndex = index < 0 ? undefined : index;
  }

  useDictionary(height: number): boolean {
    return !!this.getDictionary(height);
  }

  /**
   *
   * @param dataSources
   */

  buildDictionaryEntryMap(dataSources: BlockHeightMap<DS[]>): void {
    for (const dict of this._dictionaries) {
      dict.updateQueriesMap(dataSources);
    }
  }

  async scopedDictionaryEntries(
    startBlockHeight: number,
    scaledBatchSize: number,
    latestFinalizedHeight: number, //api FinalizedHeight
    skipDictionaryIndex: Set<number> = new Set<number>()
  ): Promise<DictionaryResponse<number | IBlock<FB>> | undefined> {
    // Initialize skipDictionaryIndex as an empty array
    // Attempt to get data from the current dictionary
    // const result = await this.tryGetDictionaryData(startBlockHeight, scaledBatchSize, latestFinalizedHeight, skipDictionaryIndex);
    let result: DictionaryResponse<number | IBlock<FB>> | undefined;
    const dictionary = this.getDictionary(startBlockHeight, skipDictionaryIndex);
    if (!dictionary) {
      return undefined;
    }
    try {
      const queryEndBlock = dictionary.getQueryEndBlock(startBlockHeight + scaledBatchSize, latestFinalizedHeight);
      result = await dictionary.getData(startBlockHeight, queryEndBlock, scaledBatchSize);
    } catch (error: any) {
      // Handle errors by skipping the current dictionary
      assert(
        this._currentDictionaryIndex !== undefined,
        new Error(`try get next dictionary but _currentDictionaryIndex is undefined`)
      );
      skipDictionaryIndex.add(this._currentDictionaryIndex);
      return this.scopedDictionaryEntries(
        startBlockHeight,
        scaledBatchSize,
        latestFinalizedHeight,
        skipDictionaryIndex
      );
    }
    return result;
  }

  protected async resolveDictionary(
    networkFamily: NETWORK_FAMILY,
    chainId: string,
    registryUrl: string
  ): Promise<string | undefined> {
    try {
      const response = await fetch(registryUrl);

      if (!response.ok) {
        throw new Error(`Bad response, code="${response.status}" body="${await response.text()}"`);
      }
      const dictionaryJson = await response.json();

      const dictionaries = dictionaryJson[networkFamily.toLowerCase()][chainId];

      if (Array.isArray(dictionaries) && dictionaries.length > 0) {
        // TODO choose alternatives
        return dictionaries[0];
      }
    } catch (error: any) {
      logger.error(error, 'An error occurred while fetching the dictionary:');
    }
  }
}
