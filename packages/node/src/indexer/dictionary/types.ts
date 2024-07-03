// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { MetaData } from '@subql/utils';

export type SpecVersion = {
  id: string;
  start: number; //start with this block
  end: number | null;
};

export type SpecVersionDictionary = {
  _metadata: MetaData;
  specVersions: SpecVersion[];
};
