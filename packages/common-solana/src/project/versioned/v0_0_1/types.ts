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

export interface SubqlMappingV0_0_1<T extends SubqlSolanaHandler> extends SubqlSolanaMapping<T> {
  file: string;
}

export type RuntimeDataSourceV0_0_1 = SubqlSolanaRuntimeDatasource<SubqlMappingV0_0_1<SubqlSolanaRuntimeHandler>>;
export type CustomDatasourceV0_0_1 = SubqlSolanaCustomDatasource<string, SubqlMappingV0_0_1<SubqlSolanaCustomHandler>>;

export interface SolanaProjectManifestV0_0_1 extends ISolanaProjectManifest {
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

  dataSources: (RuntimeDataSourceV0_0_1 | CustomDatasourceV0_0_1)[];
}

export function isRuntimeDataSourceV0_0_1(dataSource: SubqlSolanaDatasource): dataSource is RuntimeDataSourceV0_0_1 {
  return (
    dataSource.kind === SubqlSolanaDatasourceKind.Runtime && !!(dataSource as RuntimeDataSourceV0_0_1).mapping.file
  );
}
