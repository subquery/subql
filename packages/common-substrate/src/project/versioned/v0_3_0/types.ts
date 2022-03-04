// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RuntimeDataSourceV0_2_0, CustomDatasourceV0_2_0} from '@subql/common';
import {SubqlDatasource, SubqlDatasourceKind} from '@subql/types';
import {ISubstrateProjectManifest} from '../../types';

export interface ProjectManifestV0_3_0 extends ISubstrateProjectManifest {
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
    chainId?: string;
  };

  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
}

export function isSubstrateRuntimeDataSourceV0_3_0(dataSource: SubqlDatasource): dataSource is RuntimeDataSourceV0_2_0 {
  return dataSource.kind === SubqlDatasourceKind.Runtime && !!(dataSource as RuntimeDataSourceV0_2_0).mapping.file;
}
