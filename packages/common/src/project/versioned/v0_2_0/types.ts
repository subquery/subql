// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest, SubqlDataSource, SubqlMapping} from '../../types';

export interface SubqlMappingV0_2_0 extends SubqlMapping {
  file: string;
}

export type RuntimeDataSourceV0_2_0 = SubqlDataSource<SubqlMappingV0_2_0>;

export interface ProjectManifestV0_2_0 extends IProjectManifest {
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

  dataSources: RuntimeDataSourceV0_2_0[];
}

export function isRuntimeDataSourceV0_2_0(dataSource: SubqlDataSource): dataSource is RuntimeDataSourceV0_2_0 {
  return !!(dataSource as RuntimeDataSourceV0_2_0).mapping.file;
}
