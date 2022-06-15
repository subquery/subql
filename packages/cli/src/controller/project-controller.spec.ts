// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ROOT_API_URL_DEV} from '../constants';
import {delay} from '../utils';
import {createProject, deleteProject} from './project-controller';

const projectSpec = {
  org: process.env.SUBQL_ORG_TEST,
  project_name: 'mocked_project',
  repository: 'https://github.com/bz888/test-deployment-2',
  ipfs: 'QmaVh8DGzuRCJZ5zYEDxXQsXYqP9HihjjeuxNNteSDq8xX',
  subtitle: '',
  description: '',
  logoURl: '',
  apiVersion: '2',
};

// Replace/Update your access token when test locally
const testAuth = process.env.SUBQL_ACCESS_TOKEN_TEST;

jest.setTimeout(120000);
describe('CLI create project and delete project', () => {
  it('Create project and delete', async () => {
    const {apiVersion, description, logoURl, org, project_name, repository, subtitle} = projectSpec;
    const create_project = await createProject(
      org,
      subtitle,
      logoURl,
      project_name,
      testAuth,
      repository,
      description,
      apiVersion,
      ROOT_API_URL_DEV
    );
    await delay(10);
    const delete_project = await deleteProject(testAuth, projectSpec.org, projectSpec.project_name, ROOT_API_URL_DEV);
    expect(create_project.key).toMatch('bz888/mocked_project');
    expect(delete_project).toMatch('bz888/mocked_project');
  });
});
