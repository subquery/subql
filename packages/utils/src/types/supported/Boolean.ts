// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
