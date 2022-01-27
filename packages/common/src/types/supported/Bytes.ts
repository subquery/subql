// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {isHex, hexToU8a} from '@polkadot/util';
import {DataTypes} from 'sequelize';
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
