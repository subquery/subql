// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlCosmosCustomDatasource,
  SubqlCosmosCustomHandler,
  SubqlCosmosDatasource,
  SubqlCosmosDatasourceKind,
  SubqlCosmosHandler,
  SubqlCosmosMapping,
  SubqlCosmosRuntimeDatasource,
  SubqlCosmosRuntimeHandler,
} from '@subql/types-cosmos';
import {ICosmosProjectManifest} from '../../types';

export interface SubqlMappingV0_3_0<T extends SubqlCosmosHandler> extends SubqlCosmosMapping<T> {
  file: string;
}

export type RuntimeDataSourceV0_3_0 = SubqlCosmosRuntimeDatasource<SubqlMappingV0_3_0<SubqlCosmosRuntimeHandler>>;
export type CustomDatasourceV0_3_0 = SubqlCosmosCustomDatasource<string, SubqlMappingV0_3_0<SubqlCosmosCustomHandler>>;

export interface CosmosProjectManifestV0_3_0 extends ICosmosProjectManifest {
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

export function isRuntimeDataSourceV0_3_0(dataSource: SubqlCosmosDatasource): dataSource is RuntimeDataSourceV0_3_0 {
  return (
    dataSource.kind === SubqlCosmosDatasourceKind.Runtime && !!(dataSource as RuntimeDataSourceV0_3_0).mapping.file
  );
}
