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
    endpoint?: string;
    dictionary?: string;
    chainId: string;
  };
  dataSources: D[];
  repository?: string;
  description?: string;
}
