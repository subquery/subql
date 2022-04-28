// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/common-avalanche';
import {SubqlDatasource} from '@subql/types';

export type ISubstrateProjectManifest = IProjectManifest<SubqlDatasource>;

export interface SubstrateProjectNetworkConfig extends ProjectNetworkConfig {
  genesisHash?: string;
}
