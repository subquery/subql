// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {copyFolderSync} from '../../../utils';
import {ROOT_MAPPING_DIR} from '../../generate-controller';

export async function migrateMapping(subgraphDir: string, subqlDir: string) {
  const subqlMappingPath = path.join(subqlDir, ROOT_MAPPING_DIR);
  await fs.promises.rm(subqlMappingPath, {force: true, recursive: true});
  await fs.promises.mkdir(subqlMappingPath, {recursive: true});
  // copy over src
  copyFolderSync(path.join(subgraphDir, '/src'), path.join(subqlDir, '/src'));
  console.log(
    `* Mapping handlers have been copied over, they will need to be updated to work with SubQuery. See our documentation for more details https://academy.subquery.network/build/graph-migration.html#codegen`
  );
}
