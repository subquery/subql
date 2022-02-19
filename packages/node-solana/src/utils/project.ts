// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  SubqlSolanaCustomHandler,
  SubqlSolanaHandler,
  SubqlSolanaHandlerKind,
  SubqlSolanaRuntimeHandler,
} from '@subql/types-solana';
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

// We cache this to avoid repeated reads from fs
const projectEntryCache: Record<string, string> = {};

export function getProjectEntry(root: string): string {
  const pkgPath = path.join(root, 'package.json');
  try {
    if (!projectEntryCache[pkgPath]) {
      const content = fs.readFileSync(pkgPath).toString();
      const pkg = JSON.parse(content);
      if (!pkg.main) {
        return './dist';
      }
      projectEntryCache[pkgPath] = pkg.main.startsWith('./')
        ? pkg.main
        : `./${pkg.main}`;
    }

    return projectEntryCache[pkgPath];
  } catch (err) {
    throw new Error(
      `can not find package.json within directory ${this.option.root}`,
    );
  }
}

export function isBaseSolanaHandler(
  handler: SubqlSolanaHandler,
): handler is SubqlSolanaRuntimeHandler {
  return Object.values<string>(SubqlSolanaHandlerKind).includes(handler.kind);
}

export function isCustomSolanaHandler<K extends string>(
  handler: SubqlSolanaHandler,
): handler is SubqlSolanaCustomHandler<K> {
  return !isBaseSolanaHandler(handler);
}
