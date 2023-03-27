// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {isEqual} from 'lodash';
import LRUCache from 'lru-cache';
import {Sequelize, Transaction} from 'sequelize';

export type HistoricalModel = {__block_range: any};

export interface ICachedModel<T> {
  count: (
    field?: keyof T,
    value?: T[keyof T] | T[keyof T][],
    options?: {distinct?: boolean; col?: keyof T}
  ) => Promise<number>;
  get: (id: string) => Promise<T | null>;
  // limit always defined from store
  getByField: (
    field: keyof T,
    value: T[keyof T] | T[keyof T][],
    options?: {limit: number; offset?: number}
  ) => Promise<T[] | undefined>;
  getOneByField: (field: keyof T, value: T[keyof T]) => Promise<T | undefined>;
  set: (id: string, data: T, blockHeight: number) => void;
  bulkCreate: (data: T[], blockHeight: number) => void;
  bulkUpdate: (data: T[], blockHeight: number, fields?: string[]) => void;
  remove: (id: string, blockHeight: number) => void;
}

export interface ICachedModelControl {
  isFlushable: boolean;
  flushableRecordCounter: number;
  flush(tx: Transaction, sequelize?: Sequelize): Promise<void>;
}

export type EntitySetData = Record<string, SetData<any>>;

export type GetValue<T> = {
  // Null value indicates its not defined in the db
  data: T | null;
  // Future-proof to allow meta for clearing cache
};

export type RemoveValue = {
  removedAtBlock: number;
};

export type SetValue<T> = {
  data: T;
  startHeight: number;
  endHeight: number | null;
};

export type SetData<T> = Record<string, SetValueModel<T>>;

export class SetValueModel<T> {
  private historicalValues: SetValue<T>[] = [];
  private _latestIndex = -1;

  create(data: T, blockHeight: number): void {
    this.historicalValues.push({data, startHeight: blockHeight, endHeight: null});
    this._latestIndex += 1;
  }

  set(data: T, blockHeight: number): void {
    const latestIndex = this.latestIndex();

    if (latestIndex >= 0) {
      // Set multiple time within same block, replace with input data only
      if (this.historicalValues[latestIndex].startHeight === blockHeight) {
        this.historicalValues[latestIndex].data = data;
      } else if (this.historicalValues[latestIndex].startHeight > blockHeight) {
        throw new Error(`Can not set record with block height ${blockHeight}`);
      } else {
        this.historicalValues[latestIndex].endHeight = blockHeight;
        this.create(data, blockHeight);
      }
    } else {
      this.create(data, blockHeight);
    }
  }

  latestIndex(): number {
    if (this.historicalValues.length === 0) {
      return -1;
    } else {
      // Expect latestIndex should always sync with array growth
      if (this.historicalValues.length - 1 !== this._latestIndex) {
        this._latestIndex = this.historicalValues.findIndex((value) => value.endHeight === null);
      }
      return this._latestIndex;
    }
  }

  getLatest(): SetValue<T> | undefined {
    const latestIndex = this.latestIndex();
    if (latestIndex === -1) {
      return;
    }
    return this.historicalValues[latestIndex];
  }

  getFirst(): SetValue<T> | undefined {
    return this.historicalValues[0];
  }

  getValues(): SetValue<T>[] {
    return this.historicalValues;
  }

  markAsRemoved(removeAtBlock: number): void {
    const latestIndex = this.latestIndex();
    if (latestIndex === -1) {
      return;
    }
    this.historicalValues[latestIndex].endHeight = removeAtBlock;
  }

  isMatchData(field?: keyof T, value?: T[keyof T] | T[keyof T][]): boolean {
    if (field === undefined && value === undefined) {
      return true;
    }
    if (Array.isArray(value)) {
      return value.findIndex((v) => this.isMatchData(field, value)) > -1;
    } else {
      return isEqual(this.getLatest().data[field], value);
    }
  }
}

export class GetData<T> extends LRUCache<string, T, unknown> {}
