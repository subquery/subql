// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {
  ProjectManifestVersioned,
  VersionedProjectManifest,
} from '@subql/common/project/versioned/ProjectManifestVersioned';
import yaml from 'js-yaml';

function loadFromFile(file: string): unknown {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  return yaml.load(fs.readFileSync(filePath, 'utf-8'));
}

export function loadProjectManifest(file: string): ProjectManifestVersioned {
  const doc = loadFromFile(file);
  const projectManifest = new ProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
