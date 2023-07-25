// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {RunnerQueryBaseModel} from '@subql/common';
import {validateSync} from 'class-validator';
import {DeploymentV1_0_0, SorobanRunnerNodeImpl, SorobanRunnerSpecsImpl} from '../project/versioned/v1_0_0';
import {loadSorobanProjectManifest} from './load';

const projectsDir = path.join(__dirname, '../../test');

describe('project.yaml', () => {
  it('can validate project.yaml', () => {
    expect(() => loadSorobanProjectManifest(path.join(projectsDir, 'project_falsy.yaml'))).toThrow();
    expect(() => loadSorobanProjectManifest(path.join(projectsDir, 'project_falsy_array.yaml'))).toThrow();
  });

  it('can fail validation if version not supported', () => {
    expect(() => loadSorobanProjectManifest(path.join(projectsDir, 'project_invalid_version.yaml'))).toThrow();
  });

  it('can validate a v1.0.0 project.yaml with templates', () => {
    expect(() => loadSorobanProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'))).not.toThrow();
  });

  it('get v1.0.0 deployment mapping filter', () => {
    const manifestVersioned = loadSorobanProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));

    const deployment = manifestVersioned.asV1_0_0.deployment;
    const filter = deployment.dataSources[0].mapping.handlers[0].filter;
    const deploymentString = manifestVersioned.toDeployment();
    expect(filter).not.toBeNull();
    expect(deploymentString).toContain('COUNTER');
  });

  it('can convert genesis hash in v1.0.0 to chainId in deployment', () => {
    const deployment = loadSorobanProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml')).asV1_0_0.deployment;
    expect(deployment.network.chainId).not.toBeNull();
    console.log(deployment.network.chainId);
  });

  it.skip('can get chainId for deployment', () => {
    const deployment = loadSorobanProjectManifest(path.join(projectsDir, 'project_1.0.0_chainId.yaml')).asV1_0_0
      .deployment;
    expect(deployment.network.chainId).toBe('moonbeamChainId');
  });

  it('can validate deployment runner versions', () => {
    const deployment = new DeploymentV1_0_0();
    const nodeImp = new SorobanRunnerNodeImpl();
    const queryImp = new RunnerQueryBaseModel();
    deployment.specVersion = '1.0.0';
    deployment.runner = new SorobanRunnerSpecsImpl();

    nodeImp.name = '@subql/node-soroban';
    nodeImp.version = '0.29.1';
    deployment.runner.node = nodeImp;

    queryImp.name = '@subql/query';
    queryImp.version = '0.213.1';

    deployment.runner.query = queryImp;

    validateSync(deployment.runner, {whitelist: true, forbidNonWhitelisted: true});
  });

  it('can validate a v1.0.0 project.yaml with unsupported runner node', () => {
    expect(() => loadSorobanProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner.yaml'))).toThrow();
  });

  //TODO, pre-release should be excluded
  it.skip('can throw error with unsupported runner version', () => {
    expect(() => loadSorobanProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner_version.yaml'))).toThrow();
  });

  it('can validate a v1.0.0 project.yaml runner and datasource mismatches', () => {
    expect(() => loadSorobanProjectManifest(path.join(projectsDir, 'project_1.0.0_runner_ds_mismatch.yaml'))).toThrow();
  });

  it('can fail validation if custom ds missing processor', () => {
    expect(() => loadSorobanProjectManifest(path.join(projectsDir, 'project_0.2.0_invalid_custom_ds.yaml'))).toThrow();
  });
});
