// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {numberToU8a} from '@polkadot/util';
import {TypeClass} from '../TypeClass';
import {wrappedNumToU8a} from '../u8aUtils';

export const Int = new TypeClass(
  'Int',
  (data: number): Uint8Array => {
    return data < 0 ? wrappedNumToU8a(data) : numberToU8a(data);
  },
  'number',
  'Int',
  'integer'
);
