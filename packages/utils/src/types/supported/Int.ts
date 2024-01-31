// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {numberToU8a} from '@polkadot/util';
import {TypeClass} from '../TypeClass';

export const Int = new TypeClass(
  'Int',
  (data: number): Uint8Array => {
    return numberToU8a(data);
  },
  'number',
  'Int',
  'integer'
);
