// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {StellarProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function parseStellarProjectManifest(raw: unknown): StellarProjectManifestVersioned {
  const projectManifest = new StellarProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
