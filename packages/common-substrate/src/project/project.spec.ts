// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {
  extensionIsTs,
  getManifestPath,
  loadFromJsonOrYaml,
  loadProjectFromScript,
  RunnerQueryBaseModel,
  SemverVersionValidator,
} from '@subql/common';
import {SubstrateProjectManifestVersioned, VersionedProjectManifest} from '@subql/common-substrate';
import {validateSync} from 'class-validator';
import {DeploymentV1_0_0, SubstrateRunnerNodeImpl, SubstrateRunnerSpecsImpl} from '../project/versioned/v1_0_0';

const projectsDir = path.join(__dirname, '../../test');

async function loadSubstrateProjectManifest(file: string): Promise<SubstrateProjectManifestVersioned> {
  let doc;
  const {ext} = path.parse(file);
  if (extensionIsTs(ext)) {
    doc = await loadProjectFromScript(file);
  } else {
    doc = loadFromJsonOrYaml(getManifestPath(file));
  }
  const projectManifest = new SubstrateProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

describe('project manifest', () => {
  it('can load ts manifest', async () => {
    const manifest = await loadSubstrateProjectManifest(path.join(projectsDir, 'project.ts'));
    expect(manifest.isV1_0_0).toBeTruthy();
    expect(() => manifest.toDeployment()).not.toThrow();
  });

  it('can parse project.yaml to ProjectManifestImpl', async () => {
    await expect(loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'))).resolves.toBeTruthy();
  });

  it('can validate project.yaml', async () => {
    await expect(loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_falsy.yaml'))).rejects.toThrow();
    await expect(
      loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_falsy_array.yaml'))
    ).rejects.toThrow();
  });

  it('can fail validation if version not supported', async () => {
    await expect(
      loadSubstrateProjectManifest(path.join(projectsDir, 'project_invalid_version.yaml'))
    ).rejects.toThrow();
  });

  it('can validate a v1.0.0 project.yaml with templates', async () => {
    await expect(loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'))).resolves.not.toThrow();
  });

  it('can convert genesis hash in v1.0.0 to chainId in deployment', async () => {
    const deployment = (await loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'))).asV1_0_0
      .deployment;
    expect(deployment.network.chainId).not.toBeNull();
  });

  it('can get chainId for deployment', async () => {
    const deployment = (await loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_chainId.yaml')))
      .asV1_0_0.deployment;
    expect(deployment.network.chainId).toBe('moonbeamChainId');
  });

  it('can get runner options for deployment', async () => {
    const deployment = (await loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_node_options.yaml')))
      .asV1_0_0.deployment;
    expect(deployment.runner.node.options.unsafe).toBeTruthy();
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

  it('deployment can wrong whitelist processor option', async () => {
    const manifest = await loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_processor.yaml'));
    // This because we not whitelist manifest, as user could use yaml anchors.
    expect((manifest.dataSources[0] as any).processor.something).toBeDefined();
    const deployment = manifest.asV1_0_0.deployment;
    expect((deployment.dataSources[0] as any).processor.something).toBeUndefined();
    expect((deployment.dataSources[0] as any).processor.options).toBeDefined();
  });

  it('can validate bypass blocks', async () => {
    const deployment = (await loadSubstrateProjectManifest(path.join(projectsDir, 'project_bypass.yaml'))).asV1_0_0
      .deployment;
    const range_deployment = (await loadSubstrateProjectManifest(path.join(projectsDir, 'project_bypass_range.yaml')))
      .asV1_0_0.deployment;

    expect(deployment.network.bypassBlocks).not.toBeNull();
    expect(range_deployment.network.bypassBlocks).not.toBeNull();

    await expect(loadSubstrateProjectManifest(path.join(projectsDir, 'project_bypass.yaml'))).resolves.not.toThrow();
    await expect(
      loadSubstrateProjectManifest(path.join(projectsDir, 'project_bypass_range.yaml'))
    ).resolves.not.toThrow();
  });

  it('can validate a v1.0.0 project.yaml with unsupported runner node', async () => {
    await expect(
      loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner.yaml'))
    ).rejects.toThrow();
  });

  it('can throw error with unsupported runner version', async () => {
    await expect(
      loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner_version.yaml'))
    ).rejects.toThrow();
  });

  it('can validate a v1.0.0 project.yaml runner and datasource mismatches', async () => {
    await expect(
      loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0_runner_ds_mismatch.yaml'))
    ).rejects.toThrow();
  });

  it('can fail validation if custom ds missing processor', async () => {
    await expect(
      loadSubstrateProjectManifest(path.join(projectsDir, 'project_0.2.0_invalid_custom_ds.yaml'))
    ).rejects.toThrow();
  });

  it('can convert project with assets to deployment', async () => {
    const manifest = await loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));
    expect(manifest.isV1_0_0).toBeTruthy();
    expect(() => manifest.toDeployment()).not.toThrow();
  });

  it('validate versions', () => {
    const checkVersion = new SemverVersionValidator();

    // Versions
    expect(checkVersion.validate('*')).toBeTruthy();
    expect(checkVersion.validate('0.0.0')).toBeTruthy();
    expect(checkVersion.validate('0.1.0')).toBeTruthy();
    expect(checkVersion.validate('1.2.0')).toBeTruthy();
    expect(checkVersion.validate('^0.0.0')).toBeTruthy();
    expect(checkVersion.validate('>=0.1.0')).toBeTruthy();
    expect(checkVersion.validate('<0.1.1-1')).toBeTruthy();
    expect(checkVersion.validate('>=1.2.0')).toBeTruthy();
    expect(checkVersion.validate('~1.2.0-1')).toBeTruthy();
    expect(checkVersion.validate('>=1.2.0-abc')).toBeTruthy();

    expect(checkVersion.validate('0.1.1-1')).toBeFalsy();
    expect(checkVersion.validate('1.2.0-1')).toBeFalsy();
    expect(checkVersion.validate('1.2.0-abc')).toBeFalsy();
    expect(checkVersion.validate('~')).toBeFalsy();
    expect(checkVersion.validate('latest')).toBeFalsy();
    expect(checkVersion.validate('dev')).toBeFalsy();
  });
});
