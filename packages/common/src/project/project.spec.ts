// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {loadProjectManifest} from './load';

const projectsDir = path.join(__dirname, '../../test');

describe('project.yaml', () => {
  it('can parse project.yaml to ProjectManifestImpl', () => {
    expect(loadProjectManifest(path.join(projectsDir, 'project.yaml'))).toBeTruthy();
  });

  it('can validate project.yaml', () => {
    expect(() => loadProjectManifest(path.join(projectsDir, 'project_falsy.yaml'))).toThrow();
    expect(() => loadProjectManifest(path.join(projectsDir, 'project_falsy_array.yaml'))).toThrow();
  });

  it('can validate a v0.2.0 project.yaml', () => {
    expect(() => loadProjectManifest(path.join(projectsDir, 'project_0.2.0.yaml'))).not.toThrow();
  });

  it('can fail validation if version not supported', () => {
    expect(() => loadProjectManifest(path.join(projectsDir, 'project_invalid_version.yaml'))).toThrow();
  });

  it('can validate a v0.2.0 project.yaml with a custom data source', () => {
    expect(() => loadProjectManifest(path.join(projectsDir, 'project_0.2.0_custom_ds.yaml'))).not.toThrow();
  });

  it('can fail validation if custom ds missing processor', () => {
    expect(() => loadProjectManifest(path.join(projectsDir, 'project_0.2.0_invalid_custom_ds.yaml'))).toThrow();
  });
});
