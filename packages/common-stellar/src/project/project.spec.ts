// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {RunnerQueryBaseModel, loadFromJsonOrYaml} from '@subql/common';
import {validateSync} from 'class-validator';
import {DeploymentV1_0_0, StellarRunnerNodeImpl, StellarRunnerSpecsImpl} from '../project/versioned/v1_0_0';
import {StellarProjectManifestVersioned, VersionedProjectManifest} from './versioned';

const projectsDir = path.join(__dirname, '../../test');

function loadStellarProjectManifest(file: string): StellarProjectManifestVersioned {
  let manifestPath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    const yamlFilePath = path.join(file, 'project.yaml');
    const jsonFilePath = path.join(file, 'project.json');
    if (fs.existsSync(yamlFilePath)) {
      manifestPath = yamlFilePath;
    } else if (fs.existsSync(jsonFilePath)) {
      manifestPath = jsonFilePath;
    } else {
      throw new Error(`Could not find project manifest under dir ${file}`);
    }
  }

  const doc = loadFromJsonOrYaml(manifestPath);
  const projectManifest = new StellarProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

describe('project.yaml', () => {
  it('can validate project.yaml', () => {
    expect(() => loadStellarProjectManifest(path.join(projectsDir, 'project_falsy.yaml'))).toThrow();
    expect(() => loadStellarProjectManifest(path.join(projectsDir, 'project_falsy_array.yaml'))).toThrow();
  });

  it('can fail validation if version not supported', () => {
    expect(() => loadStellarProjectManifest(path.join(projectsDir, 'project_invalid_version.yaml'))).toThrow();
  });

  it('can validate a v1.0.0 project.yaml with templates', () => {
    expect(() => loadStellarProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'))).not.toThrow();
  });

  it('get v1.0.0 deployment mapping filter - transaction', () => {
    const manifestVersioned = loadStellarProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));

    const deployment = manifestVersioned.asV1_0_0.deployment;
    const filter = deployment.dataSources[0].mapping.handlers[0].filter;
    const deploymentString = manifestVersioned.toDeployment();
    expect(filter).not.toBeNull();
    expect(deploymentString).toContain('account');
  });

  it('get v1.0.0 deployment mapping filter - operation', () => {
    const manifestVersioned = loadStellarProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));

    const deployment = manifestVersioned.asV1_0_0.deployment;
    const filter = deployment.dataSources[0].mapping.handlers[1].filter;
    const deploymentString = manifestVersioned.toDeployment();
    expect(filter).not.toBeNull();
    expect(deploymentString).toContain('account_merge');
  });

  it('get v1.0.0 deployment mapping filter - effect', () => {
    const manifestVersioned = loadStellarProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));

    const deployment = manifestVersioned.asV1_0_0.deployment;
    const filter = deployment.dataSources[0].mapping.handlers[2].filter;
    const deploymentString = manifestVersioned.toDeployment();
    expect(filter).not.toBeNull();
    expect(deploymentString).toContain('account_credited');
  });

  it('get v1.0.0 deployment mapping filter - events', () => {
    const manifestVersioned = loadStellarProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));

    const deployment = manifestVersioned.asV1_0_0.deployment;
    const filter = deployment.dataSources[0].mapping.handlers[3].filter;
    const deploymentString = manifestVersioned.toDeployment();
    expect(filter).not.toBeNull();
    expect(deploymentString).toContain('COUNTER');
  });

  it('can convert genesis hash in v1.0.0 to chainId in deployment', () => {
    const deployment = loadStellarProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml')).asV1_0_0.deployment;
    expect(deployment.network.chainId).not.toBeNull();
    console.log(deployment.network.chainId);
  });

  it.skip('can get chainId for deployment', () => {
    const deployment = loadStellarProjectManifest(path.join(projectsDir, 'project_1.0.0_chainId.yaml')).asV1_0_0
      .deployment;
    expect(deployment.network.chainId).toBe('moonbeamChainId');
  });

  it('can validate deployment runner versions', () => {
    const deployment = new DeploymentV1_0_0();
    const nodeImp = new StellarRunnerNodeImpl();
    const queryImp = new RunnerQueryBaseModel();
    deployment.specVersion = '1.0.0';
    deployment.runner = new StellarRunnerSpecsImpl();

    nodeImp.name = '@subql/node-stellar';
    nodeImp.version = '0.29.1';
    deployment.runner.node = nodeImp;

    queryImp.name = '@subql/query';
    queryImp.version = '0.213.1';

    deployment.runner.query = queryImp;

    validateSync(deployment.runner, {whitelist: true, forbidNonWhitelisted: true});
  });

  it('can validate a v1.0.0 project.yaml with unsupported runner node', () => {
    expect(() => loadStellarProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner.yaml'))).toThrow();
  });

  //TODO, pre-release should be excluded
  it.skip('can throw error with unsupported runner version', () => {
    expect(() => loadStellarProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner_version.yaml'))).toThrow();
  });

  it('can validate a v1.0.0 project.yaml runner and datasource mismatches', () => {
    expect(() => loadStellarProjectManifest(path.join(projectsDir, 'project_1.0.0_runner_ds_mismatch.yaml'))).toThrow();
  });

  it('can fail validation if custom ds missing processor', () => {
    expect(() => loadStellarProjectManifest(path.join(projectsDir, 'project_0.2.0_invalid_custom_ds.yaml'))).toThrow();
  });
});
