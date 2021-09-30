// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestVersioned, Reader} from '@subql/common';
import {IPackageJson} from 'package-json-type';

export interface ContextData {
  projectPath: string;
  pkg: IPackageJson;
  schema?: ProjectManifestVersioned;
}

export interface Context {
  data: ContextData;
  logger: Console;
  reader: Reader;
}
