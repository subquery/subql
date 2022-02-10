// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlDatasource,
  SubqlDatasourceKind,
  SubqlHandler,
  SubqlMapping,
  SubqlNetworkFilter,
  SubqlRuntimeDatasource,
  SubqlRuntimeHandler,
} from '@subql/types';
import {ISubstrateProjectManifest} from '../../types';

export interface SubqlMappingV0_2_0<T extends SubqlHandler> extends SubqlMapping<T> {
  file: string;
}

export type RuntimeDataSourceV0_2_0 = SubqlRuntimeDatasource<SubqlMappingV0_2_0<SubqlRuntimeHandler>>;
export type CustomDatasourceV0_2_0 = SubqlCustomDatasource<
  string,
  SubqlNetworkFilter,
  SubqlMappingV0_2_0<SubqlCustomHandler>
>;

export interface ProjectManifestV0_2_0 extends ISubstrateProjectManifest {
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

export function isRuntimeDataSourceV0_2_0(dataSource: SubqlDatasource): dataSource is RuntimeDataSourceV0_2_0 {
  return dataSource.kind === SubqlDatasourceKind.Runtime && !!(dataSource as RuntimeDataSourceV0_2_0).mapping.file;
}
