// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlDatasource, SubqlHandler, SubqlMapping, SubqlRuntimeDatasource, SubqlRuntimeHandler} from '@subql/types';
import {IProjectManifest} from '../../types';

export interface SubqlMappingV0_2_0<T extends SubqlHandler> extends SubqlMapping<T> {
  file: string;
}

export type RuntimeDataSourceV0_2_0 = SubqlRuntimeDatasource<SubqlMappingV0_2_0<SubqlRuntimeHandler>>;

export interface ProjectManifestV0_2_0 extends IProjectManifest {
  name: string;
  version: string;
  schema: {
    file: string;
  };

  network: {
    genesisHash: string;
    endpoint?: string;
    chaintypes?: {
      file: string;
    };
  };

  dataSources: RuntimeDataSourceV0_2_0[];
}

export function isRuntimeDataSourceV0_2_0(dataSource: SubqlDatasource): dataSource is RuntimeDataSourceV0_2_0 {
  return !!(dataSource as RuntimeDataSourceV0_2_0).mapping.file;
}
