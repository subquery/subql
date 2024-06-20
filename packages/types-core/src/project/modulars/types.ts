// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource, IProjectManifest} from '../index';

export interface INetworkCommonModule<D extends BaseDataSource = BaseDataSource> {
  parseProjectManifest(raw: unknown): IProjectManifest<D>;
  isRuntimeDs(ds: D): boolean;
  isCustomDs(ds: D): boolean;
}
