// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {assignWith, camelCase, isUndefined} from 'lodash';

export function assign<TObject, TSource1, TSource2>(
  target: TObject,
  src: TSource1,
  src2?: TSource2
): TObject & TSource1 & (TSource2 | undefined) {
  return assignWith(target, src, src2, (objValue, srcValue) => (isUndefined(srcValue) ? objValue : srcValue));
}

export function camelCaseObjectKey(object: Record<string, any>): object {
  return Object.keys(object).reduce(
    (result, key) => ({
      ...result,
      [camelCase(key)]: object[key],
    }),
    {}
  );
}

export function splitArrayByRatio(arr: number[], weights: number[]): number[][] {
  const result: number[][] = [];
  let start = 0;
  for (let i = 0; i < weights.length; i++) {
    const end = Math.floor(arr.length * weights[i]) + start;
    result.push(arr.slice(start, end));
    start = end;
  }
  return result;
}

export function hasValue<T>(obj: T | undefined | null): obj is T {
  return obj !== undefined && obj !== null;
}
