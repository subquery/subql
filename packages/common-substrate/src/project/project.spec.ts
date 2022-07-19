// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {RunnerQueryBaseModel, SemverVersionValidator} from '@subql/common';
import {validateSync} from 'class-validator';
import {valid, validRange, prerelease, clean, coerce} from 'semver';
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
  it('can throw error with unsupported runner version', () => {
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

  it('can convert project with assets to deployment', () => {
    const manifest = loadSubstrateProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));
    expect(manifest.isV1_0_0).toBeTruthy();
    expect(() => manifest.toDeployment()).not.toThrow();
  });

  // ^1.0.0 pass
  // * pass
  // latest or dev fail
  // >=1.0.0 pass
  // 1.2.0-120 fail
  // ^1.2.0-120 fail
  // we should in include prerelease

  it('valid semver', () => {
    const validate2 = prerelease('>=1.2.0-20');
    // const validate3 = validRange('^1.0.0', {includePrerelease: false});
    // const validate4 = valid('^0.0.1-20', {loose: true})
    const validate7 = coerce('^1.2.0-abc');
    // const validate5 = clean('^1.2.0-10')

    console.log(`validate2: ${validate2}`);
    // console.log(`validate3: ${validate3}`);
    // console.log(`validate4: ${validate4}`);
    // console.log(`validate5: ${validate5}`);
    // console.log(`validate6: ${validate6}`);
    console.log(`validate7: ${validate7}`);
    // expect(validate2).toBeTruthy();

    // need if prerelease is null return true
    // 1.2.0-abc = null
    // ^1.2.20-20 = null
    // 1.2.0-20 = -20

    const semverValidate = new SemverVersionValidator();
    const result = semverValidate.validate('^1.2.0-abc');
    console.log(`result: ${result}`);
  });
});
