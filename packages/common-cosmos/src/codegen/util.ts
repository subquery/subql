// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {parseCosmosProjectManifest, ProjectManifestImpls} from '../project';

export function validateCosmosManifest(manifest: unknown): manifest is ProjectManifestImpls {
  try {
    return !!parseCosmosProjectManifest(manifest);
  } catch (e) {
    return false;
  }
}
