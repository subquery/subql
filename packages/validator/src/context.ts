// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IPackageJson} from 'package-json-type';

export interface ContextData {
  projectPath: string;
  pkg: IPackageJson;
  schema?: unknown;
}

export interface Context {
  data: ContextData;
  logger: Console;
}
