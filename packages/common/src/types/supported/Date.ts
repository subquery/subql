// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {numberToU8a} from '@polkadot/util';
import {TypeClass} from '../TypeClass';

export const DateObj = new TypeClass(
  'Date',
  (data: Date): Uint8Array => {
    assert(data instanceof Date, `can not hash ${data}, expect instance of Date`);
    return numberToU8a(data.getTime());
  },
  'Date',
  'Date',
  'timestamp'
);
