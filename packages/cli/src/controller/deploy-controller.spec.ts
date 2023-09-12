// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ROOT_API_URL_DEV} from '../constants';
import {DeploymentDataType, DeploymentSpec, ValidateDataType} from '../types';
import {delay} from '../utils';
import {
  deployToHostedService,
  promoteDeployment,
  deleteDeployment,
  deploymentStatus,
  ipfsCID_validate,
  networkEndpoints,
  dictionaryEndpoints,
  imageVersions,
  processEndpoints,
  redeploy,
  projectsInfo,
} from './deploy-controller';
import {createProject, deleteProject} from './project-controller';

jest.setTimeout(120000);
const projectSpec: DeploymentSpec = {
  org: process.env.SUBQL_ORG_TEST,
  projectName: 'mockedstarter',
  repository: 'https://github.com/bz888/test-deployment-2',
  ipfs: 'QmaVh8DGzuRCJZ5zYEDxXQsXYqP9HihjjeuxNNteSDq8xX',
  subtitle: '',
  description: '',
  logoURl: '',
  apiVersion: '2',
  type: 'stage',
};

async function deployTestProject(
  validator: ValidateDataType,
  ipfs: string,
  org: string,
  project_name: string,
  testAuth: string,
  url: string
): Promise<DeploymentDataType> {
  const indexerV = await imageVersions(
    validator.manifestRunner.node.name,
    validator.manifestRunner.node.version,
    testAuth,
    url
  );
  const queryV = await imageVersions(
    validator.manifestRunner.query.name,
    validator.manifestRunner.query.version,
    testAuth,
    url
  );
  const endpoint = await networkEndpoints(url);
  const dictEndpoint = await dictionaryEndpoints(url);
  return deployToHostedService(
    org,
    project_name,
    testAuth,
    ipfs,
    indexerV[0],
    queryV[0],
    processEndpoints(endpoint, validator.chainId),
    projectSpec.type,
    processEndpoints(dictEndpoint, validator.chainId),
    {},
    {},
    url
  );
}

const describeIf = (condition: boolean, ...args: Parameters<typeof describe>) =>
  // eslint-disable-next-line jest/valid-describe-callback, jest/valid-title, jest/no-disabled-tests
  condition ? describe(...args) : describe.skip(...args);

// Replace/Update your access token when test locally
const testAuth = process.env.SUBQL_ACCESS_TOKEN_TEST;

describeIf(!!testAuth, 'CLI deploy, delete, promote', () => {
  beforeAll(async () => {
    const {apiVersion, description, logoURl, org, projectName, repository, subtitle} = projectSpec;
    try {
      await createProject(
        org,
        subtitle,
        logoURl,
        projectName,
        testAuth,
        repository,
        description,
        apiVersion,
        undefined,
        ROOT_API_URL_DEV
      );
    } catch (e) {
      console.warn(`Failed at create project ${projectName} ${e}`);
    }
  });

  afterAll(async () => {
    try {
      await deleteProject(testAuth, projectSpec.org, projectSpec.projectName, ROOT_API_URL_DEV);
    } catch (e) {
      console.warn('Failed to delete project', e);
    }
  });

  it('Deploy to Hosted Service and Delete', async () => {
    const {ipfs, org, projectName} = projectSpec;

    const validator = await ipfsCID_validate(ipfs, testAuth, ROOT_API_URL_DEV);
    const deploy_output = await deployTestProject(validator, ipfs, org, projectName, testAuth, ROOT_API_URL_DEV);

    const del_output = await deleteDeployment(org, projectName, testAuth, deploy_output.id, ROOT_API_URL_DEV);
    expect(typeof deploy_output.id).toBe('number');
    expect(+del_output).toBe(deploy_output.id);
  });

  // Only test locally
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('Promote Deployment', async () => {
    const {ipfs, org, projectName} = projectSpec;
    let status: string;
    let attempt = 0;
    const validator = await ipfsCID_validate(ipfs, testAuth, ROOT_API_URL_DEV);
    const deployOutput = await deployTestProject(validator, ipfs, org, projectName, testAuth, ROOT_API_URL_DEV);
    while (status !== 'running') {
      if (attempt >= 5) break;
      attempt = attempt + 1;
      await delay(30);
      status = await deploymentStatus(org, projectName, testAuth, deployOutput.id, ROOT_API_URL_DEV);
      if (status === 'running') {
        const promoteOutput = await promoteDeployment(org, projectName, testAuth, deployOutput.id, ROOT_API_URL_DEV);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(+promoteOutput).toBe(deployOutput.id);
      }
    }
  });
  it('should return true for valid ipfsCID', async () => {
    const validator = await ipfsCID_validate(projectSpec.ipfs, testAuth, ROOT_API_URL_DEV);
    expect(validator.valid).toBe(true);
  });
  it('to throw error for invalid ipfsCID', async () => {
    await expect(ipfsCID_validate('fake', testAuth, ROOT_API_URL_DEV)).rejects.toEqual(
      'Failed to validate IPFS CID: fake is not a valid subquery deployment id!'
    );
  });

  it('get Endpoint - polkadot', async () => {
    const validator = await ipfsCID_validate(projectSpec.ipfs, testAuth, ROOT_API_URL_DEV);
    const endpoints = await networkEndpoints(ROOT_API_URL_DEV);
    expect(processEndpoints(endpoints, validator.chainId)).toBe('wss://polkadot.api.onfinality.io/public-ws');
  });
  it('get DictEndpoint - polkadot', async () => {
    const validator = await ipfsCID_validate(projectSpec.ipfs, testAuth, ROOT_API_URL_DEV);
    const dict = await dictionaryEndpoints(ROOT_API_URL_DEV);
    expect(processEndpoints(dict, validator.chainId)).toBe(
      'https://api.subquery.network/sq/subquery/polkadot-dictionary'
    );
  });
  it('reDeploy to Hosted Service', async () => {
    const {ipfs, org, projectName, type} = projectSpec;
    const newIPFS = 'QmbKvrzwSmzTZi5jrhEpa6yDDHQXRURi5S4ztLgJLpBxAi';
    const validator = await ipfsCID_validate(projectSpec.ipfs, testAuth, ROOT_API_URL_DEV);

    const deployOutput = await deployTestProject(validator, ipfs, org, projectName, testAuth, ROOT_API_URL_DEV);
    const initProjectInfo = await projectsInfo(testAuth, org, projectName, ROOT_API_URL_DEV, type);

    const endpoints = await networkEndpoints(ROOT_API_URL_DEV);
    const dict = await dictionaryEndpoints(ROOT_API_URL_DEV);
    const indexerV = await imageVersions(
      validator.manifestRunner.node.name,
      validator.manifestRunner.node.version,
      testAuth,
      ROOT_API_URL_DEV
    );
    const queryV = await imageVersions(
      validator.manifestRunner.query.name,
      validator.manifestRunner.query.version,
      testAuth,
      ROOT_API_URL_DEV
    );

    await redeploy(
      org,
      projectName,
      deployOutput.id,
      testAuth,
      newIPFS,
      processEndpoints(endpoints, validator.chainId),
      processEndpoints(dict, validator.chainId),
      indexerV[0],
      queryV[0],
      {},
      {},
      ROOT_API_URL_DEV
    );
    const updatedInfo = await projectsInfo(testAuth, org, projectName, ROOT_API_URL_DEV, type);

    expect(updatedInfo.id).toBe(initProjectInfo.id);
    expect(updatedInfo.version).not.toEqual(deployOutput.version);
  });
});
