// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {loadGenericProjectManifest} from '../load';

const projectsDir = path.join(__dirname, '../../../test');

describe('0.2.0 generic project.yaml', () => {
  it('can validate a v0.2.0 project.yaml', () => {
    expect(() =>
      loadGenericProjectManifest(path.join(projectsDir, '0.2.0/substrate_project_0.2.0.yaml'))
    ).not.toThrow();
  });

  it('can fail validation if version not supported', () => {
    expect(() =>
      loadGenericProjectManifest(path.join(projectsDir, '0.2.0/substrate_project_invalid_version.yaml'))
    ).toThrow();
  });

  it('can validate substrate v0.2.0 project.yaml with a custom data source', () => {
    expect(() =>
      loadGenericProjectManifest(path.join(projectsDir, '0.2.0/substrate_project_0.2.0_custom_ds.yaml'))
    ).not.toThrow();
  });

  //It can not validate ds matching with its kind
  it('can NOT validate substrate v0.2.0 project.yaml with custom data source', () => {
    expect(() =>
      loadGenericProjectManifest(path.join(projectsDir, '0.2.0/substrate_project_0.2.0_invalid_custom_ds.yaml'))
    ).not.toThrow();
  });
});

describe('0.2.1 generic project.yaml', () => {
  it('can validate a v0.2.1 project.yaml with templates', () => {
    expect(() =>
      loadGenericProjectManifest(path.join(projectsDir, '0.2.1/substrate_project_0.2.1_templates.yaml'))
    ).not.toThrow();
  });
});

describe('1.0.0 generic project.yaml', () => {
  it('can validate substrate v1.0.0 project.yaml', () => {
    expect(() =>
      loadGenericProjectManifest(path.join(projectsDir, '1.0.0/substrate_project_1.0.0_templates.yaml'))
    ).not.toThrow();
  });

  it('can validate avalanche v1.0.0 project.yaml with templates', () => {
    expect(() =>
      loadGenericProjectManifest(path.join(projectsDir, '1.0.0/avalanche_project_1.0.0.yaml'))
    ).not.toThrow();
  });

  it('can validate avalanche v1.0.0 project.yaml with templates', () => {
    expect(() =>
      loadGenericProjectManifest(path.join(projectsDir, '1.0.0/avalanche_project_1.0.0.yaml'))
    ).not.toThrow();
  });

  it('can validate cosmos v1.0.0 project.yaml', () => {
    expect(() => loadGenericProjectManifest(path.join(projectsDir, '1.0.0/cosmos_project_1.0.0.yaml'))).not.toThrow();
  });
});
