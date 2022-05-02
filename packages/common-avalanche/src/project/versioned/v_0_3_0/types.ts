// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { IProjectManifest } from '@subql/common';
import {
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlDatasource,
  SubqlHandler,
  SubqlMapping,
  SubqlNetworkFilter,
  SubqlRuntimeDatasource,
  SubqlRuntimeHandler,
} from '@subql/types';
import {isRuntimeDs} from '../../utils';

export interface SubqlMappingV0_3_0<T extends SubqlHandler> extends SubqlMapping<T> {
  file: string;
}

export interface IRuntimeDataSourceOptions {
  abi?: string;
  address?: string;
}

export interface RuntimeDataSourceV0_3_0 extends SubqlRuntimeDatasource<SubqlMappingV0_3_0<SubqlRuntimeHandler>> {
  assets?: Map<string, {file: string}>;

  options?: IRuntimeDataSourceOptions;
}

export type CustomDatasourceV0_3_0 = SubqlCustomDatasource<
  string,
  SubqlNetworkFilter,
  SubqlMappingV0_3_0<SubqlCustomHandler>
>;

export interface ProjectManifestV0_3_0 extends IProjectManifest<SubqlDatasource> {
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
    connectionChain?: string;
  };

  dataSources: (RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0)[];
}

export function isRuntimeDataSourceV0_3_0(dataSource: SubqlDatasource): dataSource is RuntimeDataSourceV0_3_0 {
  return isRuntimeDs(dataSource) && !!(dataSource as RuntimeDataSourceV0_3_0).mapping.file;
}
