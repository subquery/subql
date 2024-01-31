// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DataTypes} from '@subql/x-sequelize';
import {TypeClass} from '../TypeClass';

export const Json = new TypeClass(
  'Json',
  (data: unknown): Uint8Array => {
    return Buffer.from(JSON.stringify(data));
  },
  undefined,
  undefined,
  DataTypes.JSONB
);
