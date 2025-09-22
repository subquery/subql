// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ROOT_API_URL_PROD} from '../constants.js';
import {delay} from '../utils/index.js';
import {createProject, deleteProject} from './project-controller.js';

const projectSpec = {
  org: process.env.SUBQL_ORG_TEST,
  projectName: 'mocked_Project',
  ipfs: 'QmaVh8DGzuRCJZ5zYEDxXQsXYqP9HihjjeuxNNteSDq8xX',
  subtitle: '',
  description: '',
  logoUrl: '',
};

// Replace/Update your access token when test locally
const testAuth = process.env.SUBQL_ACCESS_TOKEN_TEST;
const testIf = (condition: boolean, ...args: Parameters<typeof it>) =>
  // eslint-disable-next-line jest/valid-title, jest/no-disabled-tests
  condition ? it(...args) : it.skip(...args);

jest.setTimeout(120000);
describe('CLI create project and delete project', () => {
  testIf(!!testAuth, 'Create project and delete', async () => {
    const {description, logoUrl, org, projectName, subtitle} = projectSpec;
    const create_project = await createProject(ROOT_API_URL_PROD, testAuth!, {
      key: `${org}/${projectName}`,
      subtitle,
      logoUrl,
      type: 1,
      name: projectName,
      description,
      apiVersion: 'v2',
      tag: [],
    });
    await delay(10);
    const delete_project = await deleteProject(testAuth!, org!, projectName, ROOT_API_URL_PROD);
    // eslint-disable-next-line jest/no-standalone-expect
    expect(create_project.key).toMatch(`${process.env.SUBQL_ORG_TEST}/mocked_project`);
    // eslint-disable-next-line jest/no-standalone-expect
    expect(delete_project).toMatch(`${process.env.SUBQL_ORG_TEST}/mocked_project`);
  });
});
