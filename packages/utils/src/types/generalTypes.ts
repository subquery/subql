// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as supportedTypes from './supported';
import {TypeClass} from './TypeClass';

export function getTypeByScalarName(type: string): TypeClass | undefined {
  return Object.values(supportedTypes).find(({name}) => name === type);
}
