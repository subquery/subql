// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest, SubqlDataSource, SubqlMapping} from '../../types';

export interface SubqlMappingV0_0_2 extends SubqlMapping {
  file: string;
}

export type RuntimeDataSourceV0_0_2 = SubqlDataSource<SubqlMappingV0_0_2>;

export interface ProjectManifestV0_0_2 extends IProjectManifest {
  name: string;
  version: string;
  schema: {
    file: string;
  };

  network: {
    genesisHash: string;
    chaintypes?: {
      file: string;
    };
  };

  dataSources: RuntimeDataSourceV0_0_2[];
}

export function isRuntimeDataSourceV0_0_2(dataSource: SubqlDataSource): dataSource is RuntimeDataSourceV0_0_2 {
  return !!(dataSource as RuntimeDataSourceV0_0_2).mapping.file;
}
