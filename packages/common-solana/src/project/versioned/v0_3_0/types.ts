// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlSolanaCustomDatasource,
  SubqlSolanaCustomHandler,
  SubqlSolanaDatasource,
  SubqlSolanaDatasourceKind,
  SubqlSolanaHandler,
  SubqlSolanaMapping,
  SubqlSolanaRuntimeDatasource,
  SubqlSolanaRuntimeHandler,
} from '@subql/types-solana';
import {ISolanaProjectManifest} from '../../types';

export interface SubqlMappingV0_3_0<T extends SubqlSolanaHandler> extends SubqlSolanaMapping<T> {
  file: string;
}

export type RuntimeDataSourceV0_3_0 = SubqlSolanaRuntimeDatasource<SubqlMappingV0_3_0<SubqlSolanaRuntimeHandler>>;
export type CustomDatasourceV0_3_0 = SubqlSolanaCustomDatasource<string, SubqlMappingV0_3_0<SubqlSolanaCustomHandler>>;

export interface SolanaProjectManifestV0_3_0 extends ISolanaProjectManifest {
  name: string;
  version: string;
  schema: {
    file: string;
  };

  network: {
    endpoint?: string;
    dictionary?: string;
    chainId: string;
  };

  dataSources: (RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0)[];
}

export function isRuntimeDataSourceV0_3_0(dataSource: SubqlSolanaDatasource): dataSource is RuntimeDataSourceV0_3_0 {
  return dataSource.kind === SubqlSolanaDatasourceKind.Runtime && !!(dataSource as RuntimeDataSourceV0_3_0).mapping.file;
}
