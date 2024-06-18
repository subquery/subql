// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as supportedTypes from './supported';
import {TypeClass} from './TypeClass';

type TypeNameMap = {
  [K in keyof typeof supportedTypes]: {
    name: (typeof supportedTypes)[K]['name'];
    hashCodeArg: Parameters<(typeof supportedTypes)[K]['hashCode']>[0];
  };
};

export type TypeNames = (typeof supportedTypes)[keyof typeof supportedTypes]['name'];

export function getTypeByScalarName<
  T extends keyof TypeNameMap,
  R extends TypeNameMap[T]['hashCodeArg'],
  N extends TypeNameMap[T]['name'],
>(type: N | string): TypeClass<N, R> | undefined {
  const typeClass = Object.values(supportedTypes).find(({name}) => name === type);
  if (!typeClass) return undefined;

  return typeClass as TypeClass<N, R>;
}
