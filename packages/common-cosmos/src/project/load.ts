// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {loadFromJsonOrYaml} from '@subql/common';
import {CosmosProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function loadCosmosProjectManifest(file: string): CosmosProjectManifestVersioned {
  let manifestPath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    const yamlFilePath = path.join(file, 'project.yaml');
    const jsonFilePath = path.join(file, 'project.json');
    if (fs.existsSync(yamlFilePath)) {
      manifestPath = yamlFilePath;
    } else if (fs.existsSync(jsonFilePath)) {
      manifestPath = jsonFilePath;
    } else {
      throw new Error(`Could not find project manifest under dir ${file}`);
    }
  }

  const doc = loadFromJsonOrYaml(manifestPath);
  const projectManifest = new CosmosProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

export function parseCosmosProjectManifest(raw: unknown): CosmosProjectManifestVersioned {
  const projectManifest = new CosmosProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
