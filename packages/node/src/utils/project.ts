// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  SubqlCustomDatasource,
  SubqlDataSource,
  SubqlDatasourceKind,
  SubqlNetworkFilter,
  SubqlRuntimeDatasource,
} from '@subql/types';
import tar from 'tar';

export async function prepareProjectDir(projectPath: string): Promise<string> {
  const stats = fs.statSync(projectPath);
  if (stats.isFile()) {
    const sep = path.sep;
    const tmpDir = os.tmpdir();
    const tempPath = fs.mkdtempSync(`${tmpDir}${sep}`);
    // Will promote errors if incorrect format/extension
    await tar.x({ file: projectPath, cwd: tempPath });
    return tempPath.concat('/package');
  } else if (stats.isDirectory()) {
    return projectPath;
  }
}

export function isRuntimeDs(ds: SubqlDataSource): ds is SubqlRuntimeDatasource {
  return ds.kind === SubqlDatasourceKind.Runtime;
}

export function isCustomDs<F extends SubqlNetworkFilter>(
  ds: SubqlDataSource,
): ds is SubqlCustomDatasource<string, F> {
  return (
    ds.kind !== SubqlDatasourceKind.Runtime &&
    !!(ds as SubqlCustomDatasource<string, F>).processor
  );
}

// export function isBuiltinDs(ds: SubqlDataSource): ds is SubqlBuiltinDataSource {
//   return (
//     ds.kind !== SubqlDatasourceKind.Custom &&
//     ds.kind !== SubqlDatasourceKind.Runtime
//   );
// }
