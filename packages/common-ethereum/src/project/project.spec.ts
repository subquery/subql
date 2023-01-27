// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {RunnerQueryBaseModel} from '@subql/common';
import {validateSync} from 'class-validator';
import {DeploymentV1_0_0, EthereumRunnerNodeImpl, EthereumRunnerSpecsImpl} from '../project/versioned/v1_0_0';
import {loadEthereumProjectManifest} from './load';

const projectsDir = path.join(__dirname, '../../test');

describe('test eth project.yaml', () => {
  it('could get eth project template name from its deployment ', () => {
    const manifest = loadEthereumProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));
    const deployment = manifest.toDeployment();
    expect(deployment).toContain('name: Pool');
  });
});

describe.skip('project.yaml', () => {
  it('can validate project.yaml', () => {
    expect(() => loadEthereumProjectManifest(path.join(projectsDir, 'project_falsy.yaml'))).toThrow();
    expect(() => loadEthereumProjectManifest(path.join(projectsDir, 'project_falsy_array.yaml'))).toThrow();
  });

  it('can fail validation if version not supported', () => {
    expect(() => loadEthereumProjectManifest(path.join(projectsDir, 'project_invalid_version.yaml'))).toThrow();
  });

  it('can validate a v0.2.0 project.yaml with a custom data source', () => {
    expect(() => loadEthereumProjectManifest(path.join(projectsDir, 'project_0.2.0_custom_ds.yaml'))).not.toThrow();
  });

  it('can validate a v0.2.1 project.yaml with templates', () => {
    expect(() => loadEthereumProjectManifest(path.join(projectsDir, 'project_0.2.1.yaml'))).not.toThrow();
  });

  it('can validate a v1.0.0 project.yaml with templates', () => {
    expect(() => loadEthereumProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'))).not.toThrow();
  });

  it('get v1.0.0 deployment mapping filter', () => {
    const manifestVersioned = loadEthereumProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));

    const deployment = manifestVersioned.asV1_0_0.deployment;
    const filter = deployment.dataSources[0].mapping.handlers[0].filter;
    const deploymentString = manifestVersioned.toDeployment();
    expect(filter).not.toBeNull();
    expect(deploymentString).toContain('function: approve(address spender, uint256 rawAmount)');
  });

  it('can convert genesis hash in v1.0.0 to chainId in deployment', () => {
    const deployment = loadEthereumProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml')).asV1_0_0.deployment;
    expect(deployment.network.chainId).not.toBeNull();
    console.log(deployment.network.chainId);
  });

  it.skip('can get chainId for deployment', () => {
    const deployment = loadEthereumProjectManifest(path.join(projectsDir, 'project_1.0.0_chainId.yaml')).asV1_0_0
      .deployment;
    expect(deployment.network.chainId).toBe('moonbeamChainId');
  });

  it('can validate deployment runner versions', () => {
    const deployment = new DeploymentV1_0_0();
    const nodeImp = new EthereumRunnerNodeImpl();
    const queryImp = new RunnerQueryBaseModel();
    deployment.specVersion = '1.0.0';
    deployment.runner = new EthereumRunnerSpecsImpl();

    nodeImp.name = '@subql/node';
    nodeImp.version = '0.29.1';
    deployment.runner.node = nodeImp;

    queryImp.name = '@subql/query';
    queryImp.version = '0.213.1';

    deployment.runner.query = queryImp;

    validateSync(deployment.runner, {whitelist: true, forbidNonWhitelisted: true});
  });

  it('can validate a v1.0.0 project.yaml with unsupported runner node', () => {
    expect(() => loadEthereumProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner.yaml'))).toThrow();
  });

  //TODO, pre-release should be excluded
  it.skip('can throw error with unsupported runner version', () => {
    expect(() =>
      loadEthereumProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner_version.yaml'))
    ).toThrow();
  });

  it('can validate a v1.0.0 project.yaml runner and datasource mismatches', () => {
    expect(() =>
      loadEthereumProjectManifest(path.join(projectsDir, 'project_1.0.0_runner_ds_mismatch.yaml'))
    ).toThrow();
  });

  it('can fail validation if custom ds missing processor', () => {
    expect(() => loadEthereumProjectManifest(path.join(projectsDir, 'project_0.2.0_invalid_custom_ds.yaml'))).toThrow();
  });
});
