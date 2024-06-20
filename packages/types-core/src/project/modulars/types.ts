// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseCustomDataSource, BaseDataSource, IProjectManifest} from '../index';

export interface INetworkCommonModule<D extends BaseCustomDataSource | BaseDataSource = BaseDataSource> {
  parseProjectManifest(raw: unknown): IProjectManifest<D>;
  isRuntimeDs<DS extends D = D>(ds: D): ds is DS;
  isCustomDs<CDS extends D = D>(ds: D): ds is CDS;
}
