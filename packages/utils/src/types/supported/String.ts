// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {TypeClass} from '../TypeClass';

export const String = new TypeClass(
  'String',
  (data: string): Uint8Array => {
    return Buffer.from(data);
  },
  'string',
  'String',
  'text'
);
