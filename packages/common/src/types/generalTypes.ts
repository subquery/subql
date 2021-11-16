// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as supportedTypes from './supported';
import {TypeClass} from './TypeClass';

export function getTypeByScalarName(type: string): TypeClass | undefined {
  return Object.values(supportedTypes).find(({name}) => name === type) as TypeClass;
}
