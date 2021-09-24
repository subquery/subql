// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestVersioned} from '@subql/common';
import {IPackageJson} from 'package-json-type';
import {Reader} from './readers';

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
