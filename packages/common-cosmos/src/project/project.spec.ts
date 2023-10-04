// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {getManifestPath, loadFromJsonOrYaml} from '@subql/common';
import {validateCosmosManifest} from '../codegen/util';
import {parseCosmosProjectManifest} from './load';
import {CosmosProjectManifestVersioned, VersionedProjectManifest} from './versioned';

const projectsDir = path.join(__dirname, '../../test');

function loadCosmosProjectManifest(file: string): CosmosProjectManifestVersioned {
  const doc = loadFromJsonOrYaml(getManifestPath(file));
  const projectManifest = new CosmosProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

describe('project.yaml', () => {
  it('can validate a v1.0.0 project.yaml', () => {
    expect(() => loadCosmosProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'))).not.toThrow();
  });

  it('can validate a v1.0.0 project.yaml with unsupported runner node', () => {
    expect(() => loadCosmosProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner.yaml'))).toThrow();
  });
  it('assets should be validated', () => {
    expect(() =>
      loadCosmosProjectManifest(path.join(projectsDir, 'protoTest1', 'cosmwasm-project.yaml'))
    ).not.toThrow();
  });
  it('Should throw on invalid FileReference on asset', () => {
    expect(() =>
      loadCosmosProjectManifest(path.join(projectsDir, 'protoTest1', 'bad-abi-cosmos-project.yaml'))
    ).toThrow('- property dataSources[0].assets has failed the following constraints: isFileReference');
  });
  it('Ensure correctness on Cosmos Manifest validate', () => {
    const cosmosManifest = loadFromJsonOrYaml(path.join(projectsDir, './protoTest1', 'project.yaml')) as any;
    const ethManifest = loadFromJsonOrYaml(path.join(projectsDir, 'project_1.0.0_bad_runner.yaml')) as any;
    expect(validateCosmosManifest(cosmosManifest)).toBe(true);
    expect(validateCosmosManifest(ethManifest)).toBe(false);
  });
  it('Validate incorrect chaintypes', () => {
    const cosmosManifest = loadFromJsonOrYaml(
      path.join(projectsDir, './protoTest1', 'bad-chaintypes-project.yaml')
    ) as any;
    expect(() => parseCosmosProjectManifest(cosmosManifest)).toThrow('failed to parse project.yaml');
  });
  it('Ensure chaintypes existence on manifest deployment', () => {
    const cosmosManifest = loadFromJsonOrYaml(path.join(projectsDir, './protoTest1', 'project.yaml')) as any;
    const manifest = parseCosmosProjectManifest(cosmosManifest);
    expect(manifest.asImpl.network.chaintypes.size).toBeGreaterThan(0);
  });
});
