// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DEFAULT_DICT_ENDPOINT, DEFAULT_ENDPOINT, INDEXER_V, QUERY_V} from '@subql/common';
import {deployToHostedService, promoteDeployment, deleteDeployment, deploymentStatus} from './deploy-controller';
import {createProject, deleteProject} from './project-controller';

export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

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
  let deploymentID: number;

  beforeAll(async () => {
    const {apiVersion, description, logoURl, org, project_name, repository, subtitle} = projectSpec;
    try {
      const project = await createProject(
        org,
        subtitle,
        logoURl,
        project_name,
        testAuth,
        repository,
        description,
        apiVersion
      );
      console.log(project);
    } catch (e) {
      console.warn(`Failed at create project ${project_name} ${e}`);
    }
  });

  afterAll(async () => {
    try {
      await deleteProject(testAuth, projectSpec.org, projectSpec.project_name);
      console.log(`Project ${projectSpec.project_name} deleted`);
    } catch (e) {
      console.warn('Failed to delete project', e);
    }
  });

  it('Deploy to Hosted Service', async () => {
    const {ipfs, org, project_name} = projectSpec;
    deploymentID = await deployToHostedService(
      `${org}/${project_name}`,
      testAuth,
      ipfs,
      INDEXER_V,
      QUERY_V,
      DEFAULT_ENDPOINT,
      'stage',
      DEFAULT_DICT_ENDPOINT
    );
    expect(typeof deploymentID).toBe('number');
  });

  it('Delete stage deployment from Hosted Service', async () => {
    const {org, project_name} = projectSpec;
    const del_output = await deleteDeployment(`${org}/${project_name}`, testAuth, deploymentID);
    expect(del_output).toContain('Success');
    await delay(30);
  });
  it('Promote Deployment', async () => {
    const {ipfs, org, project_name} = projectSpec;
    deploymentID = await deployToHostedService(
      `${org}/${project_name}`,
      testAuth,
      ipfs,
      INDEXER_V,
      QUERY_V,
      DEFAULT_ENDPOINT,
      'stage',
      DEFAULT_DICT_ENDPOINT
    );
    console.log(deploymentID);
    // await delay(60);
    let status: string;

    do {
      status = await deploymentStatus(`${org}/${project_name}`, testAuth, deploymentID);
    } while (status !== 'running');
    {
      await delay(30);
      status = await deploymentStatus(`${org}/${project_name}`, testAuth, deploymentID);
    }

    if (status === 'running') {
      const promote_output = await promoteDeployment(`${org}/${project_name}`, testAuth, deploymentID);

      expect(promote_output).toContain('Success');
    } else {
      throw new Error('Deployment is not running');
    }
  });
});
