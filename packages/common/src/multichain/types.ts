// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {QuerySpec} from '../project';

export interface MultichainProjectManifest {
  specVersion: string;
  projects: string[];
  query: QuerySpec;
}
