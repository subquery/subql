// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegisteredTypes} from '@polkadot/types/types';
import {BaseMapping, IProjectManifest} from '@subql/common';
import {
  SubstrateRuntimeDatasource,
  SubstrateNetworkFilter,
  SubstrateRuntimeHandlerFilter,
  SubstrateRuntimeHandler,
  SubstrateDatasourceKind,
} from '@subql/types';
import {SubstrateProjectNetworkConfig} from '../../types';

export type ProjectNetworkConfigV0_0_1 = SubstrateProjectNetworkConfig & RegisteredTypes;

// export interface RuntimeDataSourceV0_0_1 extends SubstrateRuntimeDataSource {
//   name: string;
//   filter?: SubstrateNetworkFilter;
// }

export type ManifestV0_0_1Mapping = Omit<BaseMapping<SubstrateRuntimeHandlerFilter, SubstrateRuntimeHandler>, 'file'>;

export interface RuntimeDataSourceV0_0_1 extends Omit<SubstrateRuntimeDatasource, 'mapping'> {
  name: string;
  filter?: SubstrateNetworkFilter;
  kind: SubstrateDatasourceKind.Runtime;
  mapping: ManifestV0_0_1Mapping;
}

export interface ProjectManifestV0_0_1 extends IProjectManifest<RuntimeDataSourceV0_0_1> {
  schema: string;
  network: ProjectNetworkConfigV0_0_1;
}
