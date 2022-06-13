// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {delay} from '@subql/common';
import {deploymentSpec} from '../types';
import {
  deployToHostedService,
  promoteDeployment,
  deleteDeployment,
  deploymentStatus,
  ipfsCID_validate,
  getEndpoint,
  getDictEndpoint,
  getImage_v,
} from './deploy-controller';
import {createProject, deleteProject} from './project-controller';

jest.setTimeout(120000);
const projectSpec: deploymentSpec = {
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
const testAuth = 'ODkzMzUwMzM=OKu6cvHDIO7DkpxOzk7m';
// const testAuth = process.env.SUBQL_ACCESS_TOKEN;
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
    const validator = await ipfsCID_validate(ipfs, testAuth);
    const indexer_v = await getImage_v(validator.runner.node.name, validator.runner.node.version, testAuth);
    const query_v = await getImage_v(validator.runner.query.name, validator.runner.query.version, testAuth);
    const endpoint = await getEndpoint(validator.chainId);
    const dictEndpoint = await getDictEndpoint(validator.chainId);
    const deploy_output = await deployToHostedService(
      org,
      project_name,
      testAuth,
      ipfs,
      indexer_v[0],
      query_v[0],
      endpoint,
      'stage',
      dictEndpoint
    );

    const del_output = await deleteDeployment(org, project_name, testAuth, deploy_output.id);
    expect(typeof deploy_output.id).toBe('number');
    expect(+del_output).toBe(deploy_output.id);
  });

  // Only test locally
  it('Promote Deployment', async () => {
    const {ipfs, org, project_name} = projectSpec;
    let status: string;
    let attempt = 0;

    const validator = await ipfsCID_validate(ipfs, testAuth);
    const indexer_v = await getImage_v(validator.runner.node.name, validator.runner.node.version, testAuth);
    const query_v = await getImage_v(validator.runner.query.name, validator.runner.query.version, testAuth);
    const endpoint = await getEndpoint(validator.chainId);
    const dictEndpoint = await getDictEndpoint(validator.chainId);
    const deploy_output = await deployToHostedService(
      org,
      project_name,
      testAuth,
      ipfs,
      indexer_v[0],
      query_v[0],
      endpoint,
      'stage',
      dictEndpoint
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
  it('should return true for valid ipfsCID', async () => {
    const validator = await ipfsCID_validate(projectSpec.ipfs, testAuth);
    expect(validator.valid).toBe(true);
  });

  it('get Endpoint', async () => {
    const validator = await ipfsCID_validate(projectSpec.ipfs, testAuth);
    const endpoint = await getEndpoint(validator.chainId);
    expect(endpoint).toBe('wss://polkadot.api.onfinality.io/public-ws');
  });
  it('get DictEndpoint', async () => {
    const validator = await ipfsCID_validate(projectSpec.ipfs, testAuth);
    const dict = await getDictEndpoint(validator.chainId);
    expect(dict).toBe('https://api.subquery.network/sq/subquery/polkadot-dictionary');
  });
});
