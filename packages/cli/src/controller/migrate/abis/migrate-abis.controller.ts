// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {uniqWith} from 'lodash';
import {DEFAULT_ABI_DIR} from '../../generate-controller';
import {SubgraphDataSource, SubgraphProject} from '../types';

function extractAllAbiFiles(dataSources: SubgraphDataSource[]): string[] {
  return uniqWith(dataSources.flatMap((dataSource) => dataSource.mapping.abis.map((abi) => abi.file).filter(Boolean)));
}

async function copyAbiFilesToTargetPathAsync(abiFiles: string[], targetPath: string): Promise<void> {
  try {
    await Promise.all(
      abiFiles.map((file) => {
        const fileName = path.basename(file);
        const targetFilePath = path.join(targetPath, fileName);
        fs.promises.copyFile(file, targetFilePath);
      })
    );
    console.log(
      `ABI files used in project manifest copied successfully, please copy other required ABI files to ${targetPath}`
    );
  } catch (error) {
    console.error('Error copying ABI files:', error);
  }
}

export async function migrateAbis(
  subgraphManifest: SubgraphProject,
  subgraphDir: string,
  subqlDir: string
): Promise<void> {
  const abiPaths = extractAllAbiFiles(subgraphManifest.dataSources);
  const resolvedPaths = abiPaths.map((p) => path.join(subgraphDir, p));
  const targetAbiDir = path.join(subqlDir, DEFAULT_ABI_DIR);
  await copyAbiFilesToTargetPathAsync(resolvedPaths, targetAbiDir);
}
