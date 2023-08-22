// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {parseCosmosProjectManifest} from '../project/load';

export function validateCosmosManifest(manifest: {
  network: {chainTypes?: Map<string, {file: string; messages: string[]}>};
}): boolean {
  try {
    return !!parseCosmosProjectManifest(manifest);
  } catch (e) {
    return false;
  }
}
