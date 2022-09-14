// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BaseMapping} from '@subql/common';
import {
  EthereumDatasourceKind,
  SubqlHandler,
  SubqlHandlerFilter,
  SubqlRuntimeDatasource,
  SubqlRuntimeHandler,
} from '@subql/types-avalanche';

export type ManifestV0_0_1Mapping = Omit<BaseMapping<SubqlHandlerFilter, SubqlRuntimeHandler>, 'file'>;

export interface RuntimeDataSourceV0_0_1 extends Omit<SubqlRuntimeDatasource, 'mapping'> {
  name: string;
  kind: EthereumDatasourceKind.Runtime;
  mapping: ManifestV0_0_1Mapping;
}
