// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource} from '@subql/common';

export function maxEndBlockHeight<DS extends BaseDataSource>(dataSources: DS[]): number {
  const endBlocks = dataSources.map((ds) => (ds.endBlock !== undefined ? ds.endBlock : Number.MAX_SAFE_INTEGER));
  return Math.max(...endBlocks);
}
