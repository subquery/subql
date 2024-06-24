// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseCustomDataSource, BaseDataSource, IProjectManifest, ProjectManifestBaseImplInterface} from '../index';

export interface INetworkCommonModule<
  D extends BaseCustomDataSource | BaseDataSource = BaseDataSource,
  RDS extends D = D,
  CDS extends D = D,
> {
  parseProjectManifest(raw: unknown): IProjectManifest<D> & {
    // other missing interfaces ProjectManifestVersioned
    asImpl: ProjectManifestBaseImplInterface;
  };
  isRuntimeDs(ds: D): ds is RDS;
  isCustomDs(ds: D): ds is CDS;
}
