// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV0_2_0} from '@subql/common';
import {
  SubstrateCustomDatasource,
  SubstrateDatasource,
  SubstrateDatasourceKind,
  SubstrateRuntimeDatasource,
} from '@subql/types';

// export interface SubstrateMappingV0_2_0<F, T extends SubstrateRuntimeHandler> extends BaseMapping<T> {
//   file: string;
// }

export type RuntimeDataSourceV0_2_0 = SubstrateRuntimeDatasource;
export type CustomDatasourceV0_2_0 = SubstrateCustomDatasource;

export type SubstrateProjectManifestV0_2_0 = ProjectManifestV0_2_0<SubstrateDatasource>;

export function isDatasourceV0_2_0(
  dataSource: SubstrateDatasource
): dataSource is RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0 {
  return !!(dataSource as RuntimeDataSourceV0_2_0).mapping.file;
}

export function isRuntimeDataSourceV0_2_0(dataSource: SubstrateDatasource): dataSource is RuntimeDataSourceV0_2_0 {
  return dataSource.kind === SubstrateDatasourceKind.Runtime && isDatasourceV0_2_0(dataSource);
}
