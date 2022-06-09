// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DEFAULT_DICT_ENDPOINT, DEFAULT_ENDPOINT, INDEXER_V, QUERY_V, delay} from '@subql/common';
import {
  deployToHostedService,
  promoteDeployment,
  deleteDeployment,
  deploymentStatus,
  ipfsCID_validate,
} from './deploy-controller';
import {createProject, deleteProject} from './project-controller';

jest.setTimeout(120000);
const projectSpec = {
  org: 'bz888',
  project_name: 'mocked_starter',
  repository: 'https://github.com/bz888/test-deployment-2',
  ipfs: 'QmaVh8DGzuRCJZ5zYEDxXQsXYqP9HihjjeuxNNteSDq8xX',
  subtitle: '',
  description: '',
  logoURl: '',
  apiVersion: '2',
};

// Replace/Update your access token when test locally
const testAuth = process.env.SUBQL_ACCESS_TOKEN;

describe('CLI deploy, delete, promote', () => {
  beforeAll(async () => {
    const {apiVersion, description, logoURl, org, project_name, repository, subtitle} = projectSpec;
    try {
      await createProject(org, subtitle, logoURl, project_name, testAuth, repository, description, apiVersion);
    } catch (e) {
      console.warn(`Failed at create project ${project_name} ${e}`);
    }
  });

  afterAll(async () => {
    try {
      await deleteProject(testAuth, projectSpec.org, projectSpec.project_name);
    } catch (e) {
      console.warn('Failed to delete project', e);
    }
  });

  it('Deploy to Hosted Service and Delete', async () => {
    const {ipfs, org, project_name} = projectSpec;

    const deploy_output = await deployToHostedService(
      org,
      project_name,
      testAuth,
      ipfs,
      INDEXER_V,
      QUERY_V,
      DEFAULT_ENDPOINT,
      'stage',
      DEFAULT_DICT_ENDPOINT
    );

    const del_output = await deleteDeployment(org, project_name, testAuth, deploy_output.id);
    expect(typeof deploy_output.id).toBe('number');
    expect(+del_output).toBe(deploy_output.id);
  });

  // Only test locally
  it.skip('Promote Deployment', async () => {
    const {ipfs, org, project_name} = projectSpec;
    let status: string;
    let attempt = 0;

    const deploy_output = await deployToHostedService(
      org,
      project_name,
      testAuth,
      ipfs,
      INDEXER_V,
      QUERY_V,
      DEFAULT_ENDPOINT,
      'stage',
      DEFAULT_DICT_ENDPOINT
    );

    while (status !== 'running') {
      if (attempt >= 5) break;
      attempt = attempt + 1;
      await delay(30);
      status = await deploymentStatus(org, project_name, testAuth, deploy_output.id);
      if (status === 'running') {
        const promote_output = await promoteDeployment(org, project_name, testAuth, deploy_output.id);
        expect(+promote_output).toBe(deploy_output.id);
      }
    }
  });
});

describe('ipfsCID_validator', () => {
  it('should return true for valid ipfsCID', async () => {
    const validator = await ipfsCID_validate(projectSpec.ipfs, testAuth);
    expect(validator).toBe(true);
  });

  it('should return false for invalid ipfsCID', async () => {
    const validator = await ipfsCID_validate('fake_ipfs_cid', testAuth);
    expect(validator).toBe(false);
  });
});
