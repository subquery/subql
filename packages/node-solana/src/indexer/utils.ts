// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { loadFromJsonOrYaml } from '@subql/common-solana';
import {
  SecondLayerHandlerProcessor,
  SubqlSolanaCustomDatasource,
  SubqlSolanaDatasource,
  SubqlSolanaDatasourceKind,
  SubqlSolanaHandlerKind,
  SubqlSolanaRuntimeDatasource,
  ProjectManifest,
} from '@subql/types-solana';

export function isCustomSolanaDs(
  ds: SubqlSolanaDatasource,
): ds is SubqlSolanaCustomDatasource<string> {
  return (
    ds.kind !== SubqlSolanaDatasourceKind.Runtime &&
    !!(ds as SubqlSolanaCustomDatasource<string>).processor
  );
}

export function isRuntimeSolanaDs(
  ds: SubqlSolanaDatasource,
): ds is SubqlSolanaRuntimeDatasource {
  return ds.kind === SubqlSolanaDatasourceKind.Runtime;
}

function loadFromFile(file: string): unknown {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  return loadFromJsonOrYaml(filePath);
}

export function loadSolanaProjectManifest(file: string): ProjectManifest {
  const doc = loadFromFile(file) as ProjectManifest;
  return doc;
}

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SubqlSolanaHandlerKind, unknown, unknown>,
): hp is SecondLayerHandlerProcessor<
  SubqlSolanaHandlerKind.Block,
  unknown,
  E
> {
  return hp.baseHandlerKind === SubqlSolanaHandlerKind.Block;
}
