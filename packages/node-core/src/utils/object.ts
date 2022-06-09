// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {assignWith, camelCase, isUndefined} from 'lodash';

export function assign<TObject, TSource1, TSource2>(
  target: TObject,
  src: TSource1,
  src2?: TSource2
): TObject & TSource1 & TSource2 {
  return assignWith(target, src, src2, (objValue, srcValue) => (isUndefined(srcValue) ? objValue : srcValue));
}

export function camelCaseObjectKey(object: object): object {
  return Object.keys(object).reduce(
    (result, key) => ({
      ...result,
      [camelCase(key)]: object[key],
    }),
    {}
  );
}
