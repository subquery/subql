// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DataTypes} from 'sequelize';
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
