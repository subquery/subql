// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV0_2_0} from '@subql/common';
import {
  SubqlCosmosCustomDatasource,
  SubqlCosmosDatasource,
  SubqlCosmosDatasourceKind,
  SubqlCosmosRuntimeDatasource,
} from '@subql/types-cosmos';

// export interface SubstrateMappingV0_2_0<F, T extends SubstrateRuntimeHandler> extends BaseMapping<T> {
//   file: string;
// }

export type RuntimeDataSourceV0_2_0 = SubqlCosmosRuntimeDatasource;
export type CustomDatasourceV0_2_0 = SubqlCosmosCustomDatasource;

export type SubstrateProjectManifestV0_2_0 = ProjectManifestV0_2_0<SubqlCosmosDatasource>;

export function isDatasourceV0_2_0(
  dataSource: SubqlCosmosDatasource
): dataSource is RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0 {
  return !!(dataSource as RuntimeDataSourceV0_2_0).mapping.file;
}

export function isRuntimeDataSourceV0_2_0(dataSource: SubqlCosmosDatasource): dataSource is RuntimeDataSourceV0_2_0 {
  return dataSource.kind === SubqlCosmosDatasourceKind.Runtime && isDatasourceV0_2_0(dataSource);
}
