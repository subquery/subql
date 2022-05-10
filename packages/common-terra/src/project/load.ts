// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getManifestPath, loadFromJsonOrYaml} from '@subql/common';
import {TerraProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function loadTerraProjectManifest(file: string): TerraProjectManifestVersioned {
  const doc = loadFromJsonOrYaml(getManifestPath(file));
  const projectManifest = new TerraProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

export function parseTerraProjectManifest(raw: unknown): TerraProjectManifestVersioned {
  const projectManifest = new TerraProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
