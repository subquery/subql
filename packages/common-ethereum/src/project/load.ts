// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EthereumProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function parseEthereumProjectManifest(raw: unknown): EthereumProjectManifestVersioned {
  const projectManifest = new EthereumProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
