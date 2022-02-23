// Copyright 2020-2022 OnFinality Limited authors & contributors
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
import {IProjectManifest} from '../../types';

export interface SubqlMappingV0_3_0<T extends SubqlHandler> extends SubqlMapping<T> {
  file: string;
}

export type RuntimeDataSourceV0_3_0 = SubqlRuntimeDatasource<SubqlMappingV0_3_0<SubqlRuntimeHandler>>;
export type CustomDatasourceV0_3_0 = SubqlCustomDatasource<
  string,
  SubqlNetworkFilter,
  SubqlMappingV0_3_0<SubqlCustomHandler>
>;

export interface ProjectManifestV0_3_0 extends IProjectManifest {
  name: string;
  version: string;
  schema: {
    file: string;
  };

  network: {
    genesisHash: string;
    connectionChain: string;
    endpoint?: string;
    dictionary?: string;
    chaintypes?: {
      file: string;
    };
  };

  dataSources: (RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0)[];
}

export function isRuntimeDataSourceV0_3_0(dataSource: SubqlDatasource): dataSource is RuntimeDataSourceV0_3_0 {
  return dataSource.kind === SubqlDatasourceKind.Runtime && !!(dataSource as RuntimeDataSourceV0_3_0).mapping.file;
}
