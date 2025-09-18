// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'node:fs';
import path from 'node:path';
import lodash from 'lodash';
const {uniqWith} = lodash;

import {DEFAULT_ABI_DIR} from '../../generate-controller.js';
import {SubgraphDataSource, SubgraphProject} from '../types.js';

function extractAllAbiFiles(dataSources: SubgraphDataSource[]): string[] {
  return uniqWith(dataSources.flatMap((dataSource) => dataSource.mapping.abis.map((abi) => abi.file).filter(Boolean)));
}

async function copyAbiFilesToTargetPathAsync(abiFiles: string[], targetPath: string): Promise<void> {
  try {
    await Promise.all(
      abiFiles.map(async (file) => {
        const fileName = path.basename(file);
        const targetFilePath = path.join(targetPath, fileName);
        await fs.promises.copyFile(file, targetFilePath);
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
