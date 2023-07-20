// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isHex, hexToU8a} from '@polkadot/util';
import {DataTypes} from '@subql/x-sequelize';
import {TypeClass} from '../TypeClass';

export const Bytes = new TypeClass(
  'Bytes',
  (data: string | Uint8Array): Uint8Array => {
    if (data instanceof Uint8Array) return data;
    if (isHex(data)) {
      return hexToU8a(data);
    }
    throw new Error(`can not hash ${data}`);
  },
  'string',
  'Bytes',
  DataTypes.BLOB
);
