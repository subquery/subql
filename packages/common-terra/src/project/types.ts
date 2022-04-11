// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/common';
import {SubqlTerraDatasource} from '@subql/types-terra';

export type ITerraProjectManifest = IProjectManifest<SubqlTerraDatasource>;

export interface TerraProjectNetworkConfig extends ProjectNetworkConfig {
  chainId?: string;
  mantlemint?: string;
}
