// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/common';
import {SubqlSolanaDatasource} from '@subql/types-solana';

export type ISolanaProjectManifest = IProjectManifest<SubqlSolanaDatasource>;

export interface SolanaProjectNetworkConfig extends ProjectNetworkConfig {
  chainId?: string;
}
