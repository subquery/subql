// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
