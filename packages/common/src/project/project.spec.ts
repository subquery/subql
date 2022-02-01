// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {loadFromJsonOrYaml, parseProjectManifest} from './load';

const projectsDir = path.join(__dirname, '../../test');

function loadFromFile(file: string): unknown {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  return loadFromJsonOrYaml(filePath);
}

describe('project.yaml', () => {
  it('can parse project.yaml to ProjectManifestImpl', async () => {
    const raw = await loadFromFile(path.join(projectsDir, 'project.yaml'));
    const project = parseProjectManifest(raw);
    expect(project).toBeTruthy();
  });

  it('can validate project.yaml', async () => {
    const raw0 = await loadFromFile(path.join(projectsDir, 'project_falsy.yaml'));
    const raw1 = await loadFromFile(path.join(projectsDir, 'project_falsy_array.yaml'));
    expect(() => parseProjectManifest(raw0)).toThrow();
    expect(() => parseProjectManifest(raw1)).toThrow();
  });

  it('can validate a v0.2.0 project.yaml', async () => {
    const raw = await loadFromFile(path.join(projectsDir, 'project_0.2.0.yaml'));
    expect(() => parseProjectManifest(raw)).toBeTruthy();
  });

  it('can fail validation if version not supported', async () => {
    const raw = await loadFromFile(path.join(projectsDir, 'project_invalid_version.yaml'));
    expect(() => parseProjectManifest(raw)).toThrow();
  });

  it('can validate a v0.2.0 project.yaml with a custom data source', async () => {
    const raw = await loadFromFile(path.join(projectsDir, 'project_0.2.0_custom_ds.yaml'));
    expect(() => parseProjectManifest(raw)).not.toThrow();
  });

  it('can fail validation if custom ds missing processor', async () => {
    const raw = await loadFromFile(path.join(projectsDir, 'project_0.2.0_invalid_custom_ds.yaml'));
    expect(() => parseProjectManifest(raw)).toThrow();
  });
});
