// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlDatasource,
  AvalancheDatasourceKind,
  SubqlHandler,
  SubqlMapping,
  SubqlRuntimeDatasource,
  SubqlRuntimeHandler,
} from '@subql/types-avalanche';
import {IAvalancheProjectManifest} from '../../types';
import {RuntimeDataSourceV0_2_0, CustomDatasourceV0_2_0} from '../v0_2_0/types';

export interface SubqlMappingV0_3_0<T extends SubqlHandler> extends SubqlMapping<T> {
  file: string;
}

export type RuntimeDataSourceV0_3_0 = SubqlRuntimeDatasource<SubqlMappingV0_3_0<SubqlRuntimeHandler>>;
export type CustomDatasourceV0_3_0 = SubqlCustomDatasource<string, SubqlMappingV0_3_0<SubqlCustomHandler>>;

export interface AvalancheProjectManifestV0_3_0 extends IAvalancheProjectManifest {
  name: string;
  version: string;
  schema: {
    file: string;
  };

  network: {
    genesisHash: string;
    endpoint?: string;
    dictionary?: string;
    chaintypes?: {
      file: string;
    };
  };

  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
}

export function isRuntimeDataSourceV0_3_0(dataSource: SubqlDatasource): dataSource is RuntimeDataSourceV0_2_0 {
  return dataSource.kind === AvalancheDatasourceKind.Runtime && !!dataSource.mapping.file;
}
