// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegisteredTypes} from '@polkadot/types/types';
import {SubqlNetworkFilter, SubqlRuntimeDatasource} from '@subql/types';
import {IProjectManifest, ProjectNetworkConfig} from '../../types';

export type ProjectNetworkConfigV0_0_1 = ProjectNetworkConfig & RegisteredTypes;

export interface RuntimeDataSourceV0_0_1 extends SubqlRuntimeDatasource {
  name: string;
  filter?: SubqlNetworkFilter;
}

export interface ProjectManifestV0_0_1 extends IProjectManifest {
  schema: string;
  network: ProjectNetworkConfigV0_0_1;
  dataSources: RuntimeDataSourceV0_0_1[];
}
