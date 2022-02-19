// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {ProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function loadFromJsonOrYaml(file: string): unknown {
  const {ext} = path.parse(file);

  if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') {
    throw new Error(`Extension ${ext} not supported`);
  }

  const rawContent = fs.readFileSync(file, 'utf-8');
  return yaml.load(rawContent);
}

function loadFromFile(file: string): unknown {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  return loadFromJsonOrYaml(filePath);
}

export function loadTerraProjectManifest(file: string): ProjectManifestVersioned {
  const doc = loadFromFile(file);
  const projectManifest = new ProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
