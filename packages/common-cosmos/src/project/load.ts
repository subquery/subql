// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getManifestPath, loadFromJsonOrYaml} from '@subql/common';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
import {CosmosProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function loadCosmosProjectManifest(file: string): CosmosProjectManifestVersioned {
  const doc = loadFromJsonOrYaml(getManifestPath(file));
  const projectManifest = new CosmosProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

export function parseCosmosProjectManifest(raw: unknown): CosmosProjectManifestVersioned {
  const projectManifest = new CosmosProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
