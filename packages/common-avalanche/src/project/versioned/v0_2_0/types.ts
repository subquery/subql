// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV0_2_0} from '@subql/common';
import {
  AvalancheDataSource,
  SubstrateCustomDataSource,
  SubstrateDataSource,
  SubstrateDatasourceKind,
  SubstrateRuntimeDataSource,
} from '../../types';

// export interface SubstrateMappingV0_2_0<F, T extends SubstrateRuntimeHandler> extends BaseMapping<T> {
//   file: string;
// }

export type RuntimeDataSourceV0_2_0 = SubstrateRuntimeDataSource;
export type CustomDatasourceV0_2_0 = SubstrateCustomDataSource;
export type AvalancheDatasourceV0_2_0 = AvalancheDataSource;

export type SubstrateProjectManifestV0_2_0 = ProjectManifestV0_2_0<SubstrateDataSource>;

export function isDatasourceV0_2_0(
  dataSource: SubstrateDataSource
): dataSource is RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0 {
  return !!(dataSource as RuntimeDataSourceV0_2_0).mapping.file;
}

export function isRuntimeDataSourceV0_2_0(dataSource: SubstrateDataSource): dataSource is RuntimeDataSourceV0_2_0 {
  return dataSource.kind === SubstrateDatasourceKind.Runtime && isDatasourceV0_2_0(dataSource);
}
