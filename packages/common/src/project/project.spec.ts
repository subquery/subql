// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {loadProjectManifest} from './load';

const projectsDir = path.join(__dirname, '../../test');

describe('project.yaml', () => {
  // it('can parse project.yaml to ProjectManifestImpl', () => {
  //   const project = loadProjectManifest(path.join(projectsDir, 'project.yaml'), ['0.0.1']);
  //   expect(project).toBeTruthy();
  // });
  //
  // it('can validate project.yaml', () => {
  //   expect(() => loadProjectManifest(path.join(projectsDir, 'project_falsy.yaml'), ['0.0.1'])).toThrow();
  //   expect(() => loadProjectManifest(path.join(projectsDir, 'project_falsy_array.yaml'), ['0.0.1'])).toThrow();
  // });
  //
  // it('can validate a v0.0.2 project.yaml', () => {
  //   expect(() => loadProjectManifest(path.join(projectsDir, 'project_0.0.2.yaml'), ['0.0.1', '0.0.2'])).toBeTruthy();
  // });
  //
  // it('can fail validation if version not supported', () => {
  //   expect(() => loadProjectManifest(path.join(projectsDir, 'project_0.0.2.yaml'), ['0.0.1'])).toThrow();
  // });
});
