// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {CosmosProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function parseCosmosProjectManifest(raw: unknown): CosmosProjectManifestVersioned {
  const projectManifest = new CosmosProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
