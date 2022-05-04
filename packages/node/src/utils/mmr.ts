// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { DEFAULT_WORD_SIZE } from '@subql/common';
import {
  MMR,
  FileBasedDb,
  keccak256FlyHash,
} from '@subql/x-merkle-mountain-range';

export async function ensureFileBasedMmr(projectMmrPath: string): Promise<MMR> {
  let fileBasedDb: FileBasedDb;
  if (fs.existsSync(projectMmrPath)) {
    fileBasedDb = await FileBasedDb.open(projectMmrPath);
  } else {
    fileBasedDb = await FileBasedDb.create(projectMmrPath, DEFAULT_WORD_SIZE);
  }
  return new MMR(keccak256FlyHash, fileBasedDb);
}
