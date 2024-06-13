// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as supportedTypes from './supported';
import {TypeClass} from './TypeClass';

export function getTypeByScalarName<
  T extends keyof typeof supportedTypes,
  R extends Parameters<(typeof supportedTypes)[T]['hashCode']>[0],
>(type: T | string): TypeClass<R> | undefined {
  const typeClass = Object.values(supportedTypes).find(({name}) => name === type);
  if (!typeClass) return undefined;

  return typeClass as TypeClass<R>;
}
