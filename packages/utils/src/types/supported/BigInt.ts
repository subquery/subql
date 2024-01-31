// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import BN from 'bn.js';
import {TypeClass} from '../TypeClass';

export const BigInt = new TypeClass(
  'BigInt',
  (data: bigint | string): Uint8Array => {
    return new BN(data.toString()).toBuffer();
  },
  'bigint',
  'BigInt',
  'numeric'
);
