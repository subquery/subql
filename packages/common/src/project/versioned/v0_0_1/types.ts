// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegistryTypes} from '@polkadot/types/types';
import {IProjectManifest} from '@subql/common';

export interface ProjectManifestV0_0_1 extends IProjectManifest {
  schema: string;

  network: {
    endpoint: string;
    customTypes?: RegistryTypes;
  };
}
