// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {loadFromJsonOrYaml} from '@subql/common';
import {IDLObject} from 'wasm-ast-types';
import {parseCosmosProjectManifest, ProjectManifestImpls} from '../project';

export function validateCosmosManifest(manifest: unknown): manifest is ProjectManifestImpls {
  try {
    return !!parseCosmosProjectManifest(manifest);
  } catch (e) {
    return false;
  }
}

export function loadCosmwasmAbis(filePath: string): IDLObject {
  return loadFromJsonOrYaml(filePath) as IDLObject;
}

export function tmpProtoDir(tmpDir: string, protoPath: string): string {
  return path.join(tmpDir, path.basename(protoPath));
}
