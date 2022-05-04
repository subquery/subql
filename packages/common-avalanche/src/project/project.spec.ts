// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {RunnerQueryBaseModel, validateSemver} from '@subql/common';
import {validateSync} from 'class-validator';
import {DeploymentV1_0_0, SubstrateRunnerNodeImpl, SubstrateRunnerSpecsImpl} from '../project/versioned/v1_0_0';
import {loadSubstrateProjectManifest} from './load';

const projectsDir = path.join(__dirname, '../../test');

describe('project.yaml', () => {
  it('can parse project.yaml to ProjectManifestImpl', () => {
    expect(loadSubstrateProjectManifest(path.join(projectsDir, 'project.yaml'))).toBeTruthy();
  });

  it('can validate project.yaml', () => {
    expect(() => loadSubstrateProjectManifest(path.join(projectsDir, 'project_falsy.yaml'))).toThrow();
    expect(() => loadSubstrateProjectManifest(path.join(projectsDir, 'project_falsy_array.yaml'))).toThrow();
  });

  it('can validate a v0.2.0 project.yaml', () => {
    expect(() => loadSubstrateProjectManifest(path.join(projectsDir, 'project_0.2.0.yaml'))).not.toThrow();
  });

  it('can fail validation if version not supported', () => {
    expect(() => loadSubstrateProjectManifest(path.join(projectsDir, 'project_invalid_version.yaml'))).toThrow();
  });

  it('can validate a v0.2.0 project.yaml with a custom data source', () => {
    expect(() => loadSubstrateProjectManifest(path.join(projectsDir, 'project_0.2.0_custom_ds.yaml'))).not.toThrow();
  });

  it('can validate a v0.2.1 project.yaml with templates', () => {
    expect(() => loadSubstrateProjectManifest(path.join(projectsDir, 'project_0.2.1.yaml'))).not.toThrow();
  });

  it('can validate a v1.0.0 project.yaml with templates', () => {
    expect(() => loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'))).not.toThrow();
  });

  it('can convert genesis hash in v1.0.0 to chainId in deployment', () => {
    const deployment = loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml')).asV1_0_0.deployment;
    expect(deployment.network.chainId).not.toBeNull();
    console.log(deployment.network.chainId);
  });

  it('can get chainId for deployment', () => {
    const deployment = loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_chainId.yaml')).asV1_0_0
      .deployment;
    expect(deployment.network.chainId).toBe('moonbeamChainId');
  });

  it('can validate deployment runner versions', () => {
    const deployment = new DeploymentV1_0_0();
    const nodeImp = new SubstrateRunnerNodeImpl();
    const queryImp = new RunnerQueryBaseModel();
    deployment.specVersion = '1.0.0';
    deployment.runner = new SubstrateRunnerSpecsImpl();

    nodeImp.name = '@subql/node';
    nodeImp.version = '0.29.1';
    deployment.runner.node = nodeImp;

    queryImp.name = '@subql/query';
    queryImp.version = '0.213.1';

    deployment.runner.query = queryImp;

    validateSync(deployment.runner, {whitelist: true, forbidNonWhitelisted: true});
  });

  it('can validate a v1.0.0 project.yaml with unsupported runner node', () => {
    expect(() => loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner.yaml'))).toThrow();
  });

  //TODO, pre-release should be excluded
  it.skip('can throw error with unsupported runner version', () => {
    expect(() =>
      loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner_version.yaml'))
    ).toThrow();
  });

  it('can validate a v1.0.0 project.yaml runner and datasource mismatches', () => {
    expect(() =>
      loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_runner_ds_mismatch.yaml'))
    ).toThrow();
  });

  it('can fail validation if custom ds missing processor', () => {
    expect(() =>
      loadSubstrateProjectManifest(path.join(projectsDir, 'project_0.2.0_invalid_custom_ds.yaml'))
    ).toThrow();
  });
});
