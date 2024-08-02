// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {IPackageJson} from 'package-json-type';

export type ReaderOptions = {
  ipfs?: string;
};

export interface Reader {
  getProjectSchema(): Promise<unknown>;
  getPkg(): Promise<IPackageJson>;
  getFile(file: string): Promise<string>;
  root: string | undefined;
}
