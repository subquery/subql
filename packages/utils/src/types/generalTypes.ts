// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as supportedTypes from './supported';
import {TypeToHashData, TypeClass} from './TypeClass';

export function getTypeByScalarName<T extends keyof TypeToHashData>(type: string): TypeClass<T> | undefined {
  return Object.values(supportedTypes).find(({name}) => name === type) as TypeClass<T> | undefined;
}
