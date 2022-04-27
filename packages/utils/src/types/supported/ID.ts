// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {TypeClass} from '../TypeClass';

export const ID = new TypeClass(
  'ID',
  (data: any): Uint8Array => {
    return Buffer.from(data);
  },
  'string',
  'ID',
  'text'
);
