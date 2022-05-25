// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BaseDataSource} from '../base';

export interface ProjectManifestV0_2_0<D extends object = BaseDataSource> {
  name: string;
  version: string;
  schema: {
    file: string;
  };
  network: {
    genesisHash: string;
    endpoint?: string;
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
