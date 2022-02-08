// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlTerraCustomDatasource,
  SubqlTerraCustomHandler,
  SubqlTerraDatasource,
  SubqlTerraDatasourceKind,
  SubqlTerraHandler,
  SubqlTerraMapping,
  SubqlTerraRuntimeDatasource,
  SubqlTerraRuntimeHandler,
} from '@subql/types-terra';
import {IProjectManifest} from '../../types';

export interface SubqlMappingV0_3_0<T extends SubqlTerraHandler> extends SubqlTerraMapping<T> {
  file: string;
}

export type RuntimeDataSourceV0_3_0 = SubqlTerraRuntimeDatasource<SubqlMappingV0_3_0<SubqlTerraRuntimeHandler>>;
export type CustomDatasourceV0_3_0 = SubqlTerraCustomDatasource<string, SubqlMappingV0_3_0<SubqlTerraCustomHandler>>;

export interface TerraProjectManifestV0_3_0 extends IProjectManifest {
  name: string;
  version: string;
  schema: {
    file: string;
  };

  network: {
    endpoint?: string;
    dictionary?: string;
    chainId: string;
  };

  dataSources: (RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0)[];
}

export function isRuntimeDataSourceV0_3_0(dataSource: SubqlTerraDatasource): dataSource is RuntimeDataSourceV0_3_0 {
  return dataSource.kind === SubqlTerraDatasourceKind.Runtime && !!(dataSource as RuntimeDataSourceV0_3_0).mapping.file;
}
