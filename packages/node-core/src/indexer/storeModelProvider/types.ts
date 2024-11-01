// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ENUM, ModelStatic, Transaction} from '@subql/x-sequelize';
import {LRUCache} from 'lru-cache';
import {IMetadata} from './metadata';
import {BaseEntity, IModel} from './model';
import {IPoi} from './poi';
import {SetValueModel} from './setValueModel';

export type HistoricalModel = {__block_range: any};
export enum FlushPolicy {
  RealTime = 'realTime',
  Cache = 'cached',
}
export interface IStoreModelProvider {
  poi: IPoi | null;
  metadata: IMetadata;
  flushPolicy: FlushPolicy;

  getModel<T extends BaseEntity>(entity: string): IModel<T>;

  // addExporter(entity: string, exporterStore: CsvStoreService): void;

  applyPendingChanges(height: number, dataSourcesCompleted: boolean): Promise<void>;

  updateModels({modifiedModels, removedModels}: {modifiedModels: ModelStatic<any>[]; removedModels: string[]}): void;
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

export class GetData<T extends {}> extends LRUCache<string, T, unknown> {}

export interface Exporter {
  /**
   * Exports an array of records.
   * This method should handle the processing of the provided records.
   *
   * @param records An array of records to be exported.
   *                These records are of the same type as the database entries
   */
  export: (record: any[]) => Promise<void>;
  /**
   * Shuts down the export operation.
   * This method should ensure that all ongoing export operations are
   * completed and any resources used are properly released or closed.
   *
   * @returns A promise that resolves when the shutdown process is complete.
   */
  shutdown: () => Promise<void>;
}
