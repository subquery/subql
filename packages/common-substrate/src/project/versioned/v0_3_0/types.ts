// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlDatasource, SubqlDatasourceKind} from '@subql/types';
import {ISubstrateProjectManifest} from '../../types';
import {RuntimeDataSourceV0_2_0, CustomDatasourceV0_2_0} from '../v0_2_0/types';

export interface SubstrateProjectManifestV0_3_0 extends ISubstrateProjectManifest {
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
  return dataSource.kind === SubqlDatasourceKind.Runtime && !!(dataSource as RuntimeDataSourceV0_2_0).mapping.file;
}
