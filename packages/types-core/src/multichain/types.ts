// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {QuerySpec} from '../project';

export interface MultichainProjectManifest {
  specVersion: string;
  projects: string[];
  query: QuerySpec;
}
