// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'node:fs';
import path from 'node:path';
import {copyFolderSync} from '../../../utils/index.js';

export async function migrateMapping(subgraphDir: string, subqlDir: string): Promise<void> {
  const subqlSrcPath = path.join(subqlDir, '/src');
  await fs.promises.rm(subqlSrcPath, {force: true, recursive: true});
  // copy over src
  copyFolderSync(path.join(subgraphDir, '/src'), subqlSrcPath);
  console.log(
    `* Mapping handlers have been copied over, they will need to be updated to work with SubQuery. See our documentation for more details https://academy.subquery.network/build/graph-migration.html#codegen`
  );
}
