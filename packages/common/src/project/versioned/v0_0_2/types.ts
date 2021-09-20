// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest} from '../../types';

export interface ProjectManifestV0_0_2 extends IProjectManifest {
  // schema: {
  //   file: string;
  // };
  schema: string;

  network: {
    genesisHash: string;
    chaintypes: {
      file: string;
    };
  };
}
