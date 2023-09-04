// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource} from '../base';

export interface ProjectManifestV0_2_0<D extends object = BaseDataSource> {
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
  dataSources: D[];
  specVersion?: string;
  repository?: string;
  description?: string;
}
