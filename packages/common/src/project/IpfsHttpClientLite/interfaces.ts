// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {AddAllOptions} from 'ipfs-core-types/src/root';
import type {Options} from 'ipfs-http-client/types/src/types';

export interface LiteAddAllOptions extends Omit<AddAllOptions, 'progress'> {
  // Override IPFS AddAllOptions progress type
  progress?: ((progressEvent: any) => void) | undefined;
}

export interface IPFSOptions extends Omit<Options, 'headers'> {
  headers?: Record<string, string>;
}
