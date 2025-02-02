// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FieldsExpression} from '@subql/types-core';
import {isEqual} from 'lodash';
import {SetValue} from './types';

export class SetValueModel<T> {
  private historicalValues: SetValue<T>[] = [];
  private _latestIndex = -1;

  popRecordWithOpIndex(operationIndex: number): SetValue<T> | undefined {
    const opIndexInSetRecord = this.historicalValues.findIndex((v) => {
      return v.operationIndex === operationIndex;
    });
    if (opIndexInSetRecord >= 0) {
      const setRecord = this.historicalValues[opIndexInSetRecord];
      this.deleteFromHistorical(opIndexInSetRecord);
      return setRecord;
    }
  }

  set(data: T, blockHeight: number, operationIndex: number): void {
    const latestIndex = this.latestIndex();

    if (latestIndex >= 0) {
      // Set multiple time within same block, replace with input data only
      if (this.historicalValues[latestIndex].startHeight === blockHeight) {
        this.historicalValues[latestIndex].data = data;
        this.historicalValues[latestIndex].endHeight = null;
        this.historicalValues[latestIndex].removed = false;
      } else if (this.historicalValues[latestIndex].startHeight > blockHeight) {
        throw new Error(
          `Can not set record with block height ${blockHeight} as data for future block heights has been set`
        );
      } else {
        // close previous historicalValues record endHeight
        this.historicalValues[latestIndex].endHeight = blockHeight;
        this.create(data, blockHeight, operationIndex);
      }
    } else {
      this.create(data, blockHeight, operationIndex);
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

  // the latest record could be mark as removed
  // we need to handle return value in where this method called accordingly , rather than return undefined here.
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

  fromBelowHeight(height: number): SetValueModel<T> {
    const newModel = new SetValueModel<T>();

    newModel.historicalValues = this.historicalValues
      .filter((v) => v.startHeight < height)
      .map((v) => {
        if (v.endHeight && v.endHeight < height) {
          return v;
        }

        return {
          ...v,
          endHeight: null,
        };
      });

    return newModel;
  }

  fromAboveHeight(height: number): SetValueModel<T> {
    const newModel = new SetValueModel<T>();

    newModel.historicalValues = this.historicalValues.filter((v) => v.startHeight > height);

    return newModel;
  }

  markAsRemoved(removeAtBlock: number): void {
    const latestIndex = this.latestIndex();
    if (latestIndex === -1) {
      return;
    }
    this.historicalValues[latestIndex].endHeight = removeAtBlock;
    this.historicalValues[latestIndex].removed = true;
  }

  /**
   * If value is an array then it will do an OR operation
   * */
  matchesField([field, matcher, value]: FieldsExpression<T>): boolean {
    if (this.getLatest()?.removed) return false;
    const latestValue = this.getLatest()?.data?.[field];

    switch (matcher) {
      case '=':
        return isEqual(latestValue, value);
      case '!=':
        return !isEqual(latestValue, value);
      case 'in':
        return latestValue !== undefined && value.includes(latestValue);
      case '!in':
        return latestValue !== undefined && !value.includes(latestValue);
      default:
        throw new Error(`Unsupported matcher "${matcher}"`);
    }
  }

  /**
   *  Runs an AND operation over all the matchers
   * */
  matchesFields(filters: FieldsExpression<T>[]): boolean {
    return filters.every((filter) => this.matchesField(filter));
  }

  private create(data: T, blockHeight: number, operationIndex: number): void {
    this.historicalValues.push({
      data,
      startHeight: blockHeight,
      endHeight: null,
      operationIndex: operationIndex,
      removed: false,
    });
    this._latestIndex += 1;
  }

  private deleteFromHistorical(index: number) {
    this.historicalValues.splice(index, 1);
    // remove a record, also means _latestIndex position need to -1
    this._latestIndex -= 1;
  }
}
