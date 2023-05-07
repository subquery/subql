// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import LRUCache from 'lru-cache';
import {Transaction} from 'sequelize';
import {SetValueModel} from './setValueModel';

export type HistoricalModel = {__block_range: any};

export interface ICachedModel<T> {
  get: (id: string) => Promise<T | undefined>;
  // limit always defined from store
  getByField: (
    field: keyof T,
    value: T[keyof T] | T[keyof T][],
    options: {limit: number; offset: number}
  ) => Promise<T[]>;
  getOneByField: (field: keyof T, value: T[keyof T]) => Promise<T | undefined>;
  set: (id: string, data: T, blockHeight: number) => void;
  bulkCreate: (data: T[], blockHeight: number) => void;
  bulkUpdate: (data: T[], blockHeight: number, fields?: string[]) => void;
  remove: (id: string, blockHeight: number) => void;
  bulkRemove: (ids: string[], blockHeight: number) => void;
}
export interface ICachedModelControl {
  isFlushable: boolean;
  hasAssociations?: boolean;
  flushableRecordCounter: number;
  flush(tx: Transaction, blockHeight?: number): Promise<void>;
  flushOperation?(i: number, tx: Transaction): Promise<void>;
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
};

export type SetData<T> = Record<string, SetValueModel<T>>;

export class GetData<T extends {}> extends LRUCache<string, T, unknown> {}
