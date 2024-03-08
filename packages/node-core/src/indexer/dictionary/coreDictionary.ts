// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {FieldSelector} from '@subql/node-core';
import {NodeConfig} from '../../configure';
import {BlockHeightMap} from '../../utils/blockHeightMap';
import {IBlock} from '../types';
import {DictionaryResponse, IDictionary} from './types';

export abstract class CoreDictionary<DS, FB, M /* Metadata */, E /* DictionaryQueryEntry */>
  implements IDictionary<DS, FB>
{
  protected queriesMap?: BlockHeightMap<E>;
  protected _startHeight = 1;
  protected _metadata?: M;
  metadataValid: boolean | undefined;

  constructor(
    readonly dictionaryEndpoint: string | undefined,
    protected chainId: string,
    protected readonly nodeConfig: NodeConfig,
    protected readonly eventEmitter: EventEmitter2
  ) {}

  abstract getData(
    startBlock: number,
    queryEndBlock: number,
    limit: number,
    fieldSelector?: FieldSelector
  ): Promise<DictionaryResponse<IBlock | number> | undefined>;
  protected abstract init(): Promise<void>;
  protected abstract dictionaryValidation(metaData?: M, startBlockHeight?: number): boolean;
  protected abstract buildDictionaryQueryEntries(dataSources: DS[]): E;
  abstract queryMapValidByHeight(height: number): boolean;
  abstract getQueryEndBlock(targetBlockHeight: number, apiFinalizedHeight: number): number;

  get startHeight(): number {
    return this._startHeight;
  }

  protected get metadata(): M {
    if (!this._metadata) {
      throw new Error(`DictionaryV2 hasn't been initialized`);
    }
    return this._metadata;
  }

  protected get useDictionary(): boolean {
    return (!!this.dictionaryEndpoint || !!this.nodeConfig.dictionaryResolver) && !!this.metadataValid;
  }

  protected setDictionaryStartHeight(start: number | undefined): void {
    // Since not all dictionary has adopted start height, if it is not set, we just consider it is 1.
    if (this._startHeight !== undefined) {
      return;
    }
    this._startHeight = start ?? 1;
  }

  // filter dictionary with start height
  heightValidation(height: number): boolean {
    return this.dictionaryValidation(this._metadata, height);
  }

  updateQueriesMap(dataSources: BlockHeightMap<DS[]>): void {
    this.queriesMap = dataSources.map((d) => this.buildDictionaryQueryEntries(d));
  }

  protected getQueryConditions(
    startBlock: number,
    queryEndBlock: number
  ): {queryEndBlock: number; conditions: E | undefined} {
    const queryDetails = this.queriesMap?.getDetails(startBlock);
    const conditions = queryDetails?.value;
    queryEndBlock =
      queryDetails?.endHeight && queryDetails?.endHeight < queryEndBlock ? queryDetails.endHeight : queryEndBlock;
    return {queryEndBlock, conditions};
  }
}
