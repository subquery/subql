// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {numberToU8a} from '@polkadot/util';
import {TypeClass} from '../TypeClass';

export const Boolean = new TypeClass(
  'Boolean',
  (data: boolean): Uint8Array => {
    return numberToU8a(data ? 1 : 0);
  },
  'boolean',
  'Boolean',
  'boolean'
);
