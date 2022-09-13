// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV0_2_0} from '@subql/common';
import {
  SubqlDatasource,
  SubqlCustomDatasource,
  AvalancheDatasourceKind,
  SubqlRuntimeDatasource,
} from '@subql/types-avalanche';

// export interface SubstrateMappingV0_2_0<F, T extends SubstrateRuntimeHandler> extends BaseMapping<T> {
//   file: string;
// }

export type RuntimeDataSourceV0_2_0 = SubqlRuntimeDatasource;
export type CustomDatasourceV0_2_0 = SubqlCustomDatasource;

export type AvalancheProjectManifestV0_2_0 = ProjectManifestV0_2_0<SubqlDatasource>;

export function isDatasourceV0_2_0(
  dataSource: SubqlDatasource
): dataSource is RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0 {
  return !!(dataSource as RuntimeDataSourceV0_2_0).mapping.file;
}

export function isRuntimeDataSourceV0_2_0(dataSource: SubqlDatasource): dataSource is RuntimeDataSourceV0_2_0 {
  return dataSource.kind === AvalancheDatasourceKind.Runtime && isDatasourceV0_2_0(dataSource);
}
