// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Transaction} from '@subql/x-sequelize';
import {LRUCache} from 'lru-cache';
import {ModifiedDbModels} from '../../db/migration-service';
import {MetadataRepo, PoiRepo} from '../entities';
import {HistoricalMode} from '../types';
import {IMetadata} from './metadata';
import {BaseEntity, IModel} from './model';
import {IPoi} from './poi';
import {SetValueModel} from './setValueModel';

export type HistoricalModel = {__block_range: any};

export interface IStoreModelProvider {
  poi: IPoi | null;
  metadata: IMetadata;

  init(historical: HistoricalMode, meta: MetadataRepo, poi?: PoiRepo): void;

  getModel<T extends BaseEntity>(entity: string): IModel<T>;

  applyPendingChanges(height: number, dataSourcesCompleted: boolean, tx?: Transaction): Promise<void>;

  updateModels(changes: ModifiedDbModels): void;
}

export interface ICachedModelControl {
  isFlushable: boolean;
  hasAssociations?: boolean;
  flushableRecordCounter: number;
  flush(tx: Transaction, blockHeight?: number): Promise<void>;
  flushOperation?(i: number, tx: Transaction): Promise<void>;
  /**
   *
   * @param blockHeight if present, clear data that <= ${blockHeight}
   */
  clear: (blockHeight?: number) => void;
}

export type FilteredHeightRecords<T> = {
  removeRecords: Record<string, RemoveValue>;
  setRecords: SetData<T>;
};

export type EntitySetData = Record<string, SetData<any>>;

export type GetValue<T> = {
  // Null value indicates its not defined in the db
  data: T | null;
  // Future-proof to allow meta for clearing cache
};

export type RemoveValue = {
  removedAtBlock: number;
  operationIndex: number;
};

export type SetValue<T> = {
  data: T;
  startHeight: number;
  endHeight: number | null;
  operationIndex: number;
  removed: boolean;
};

export type SetData<T> = Record<string, SetValueModel<T>>;

export class GetData<T extends Record<string, unknown>> extends LRUCache<string, T, unknown> {}
