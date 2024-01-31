// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IPackageJson} from 'package-json-type';

export type ReaderOptions = {
  ipfs?: string;
};

export interface Reader {
  getProjectSchema(): Promise<unknown | undefined>;
  getPkg(): Promise<IPackageJson | undefined>;
  getFile(file: string): Promise<string | undefined>;
  root: string | undefined;
}
