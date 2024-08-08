// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ROOT_API_URL_DEV} from '../constants';
import {delay} from '../utils';
import {createProject, deleteProject} from './project-controller';

const projectSpec = {
  org: process.env.SUBQL_ORG_TEST,
  projectName: 'mocked_project',
  repository: 'https://github.com/bz888/test-deployment-2',
  ipfs: 'QmaVh8DGzuRCJZ5zYEDxXQsXYqP9HihjjeuxNNteSDq8xX',
  subtitle: '',
  description: '',
  logoURl: '',
  apiVersion: '2',
};

// Replace/Update your access token when test locally
const testAuth = process.env.SUBQL_ACCESS_TOKEN_TEST;
const testIf = (condition: boolean, ...args: Parameters<typeof it>) =>
  // eslint-disable-next-line jest/valid-title, jest/no-disabled-tests
  condition ? it(...args) : it.skip(...args);

jest.setTimeout(120000);
describe('CLI create project and delete project', () => {
  testIf(!!testAuth, 'Create project and delete', async () => {
    const {apiVersion, description, logoURl, org, projectName, repository, subtitle} = projectSpec;
    const create_project = await createProject(
      org!,
      subtitle,
      logoURl,
      1,
      projectName,
      testAuth!,
      repository,
      description,
      apiVersion,
      undefined,
      ROOT_API_URL_DEV
    );
    await delay(10);
    const delete_project = await deleteProject(testAuth!, org!, projectName, ROOT_API_URL_DEV);
    // eslint-disable-next-line jest/no-standalone-expect
    expect(create_project.key).toMatch(`${process.env.SUBQL_ORG_TEST}/mocked_project`);
    // eslint-disable-next-line jest/no-standalone-expect
    expect(delete_project).toMatch(`${process.env.SUBQL_ORG_TEST}/mocked_project`);
  });
});
