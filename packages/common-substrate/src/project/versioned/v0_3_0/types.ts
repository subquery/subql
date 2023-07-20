// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  // ISubqlProjectManifest as ISubstrateProjectManifest,
  SubstrateDatasource,
  SubstrateDatasourceKind,
} from '@subql/types';
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
    endpoint?: string | string[];
    dictionary?: string;
    chaintypes?: {
      file: string;
    };
  };

  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
}

export function isRuntimeDataSourceV0_3_0(dataSource: SubstrateDatasource): dataSource is RuntimeDataSourceV0_2_0 {
  return dataSource.kind === SubstrateDatasourceKind.Runtime && !!dataSource.mapping.file;
}
