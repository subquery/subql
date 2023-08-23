// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {parseCosmosProjectManifest, CosmosProjectManifestVersioned} from '../project';

export function validateCosmosManifest(manifest: unknown): manifest is CosmosProjectManifestVersioned {
  try {
    return !!parseCosmosProjectManifest(manifest);
  } catch (e) {
    return false;
  }
}
