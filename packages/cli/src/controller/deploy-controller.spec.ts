// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ROOT_API_URL_DEV} from '../constants';
import {DeploymentDataType, DeploymentSpec, V3DeploymentIndexerType, ValidateDataType} from '../types';
import {delay} from '../utils';
import {
  createDeployment,
  promoteDeployment,
  deleteDeployment,
  deploymentStatus,
  ipfsCID_validate,
  dictionaryEndpoints,
  imageVersions,
  processEndpoints,
  updateDeployment,
  projectsInfo,
} from './deploy-controller';
import {createProject, deleteProject} from './project-controller';

jest.setTimeout(120000);

const projectSpec: DeploymentSpec = {
  org: process.env.SUBQL_ORG_TEST!,
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
    validator.manifestRunner!.node.name,
    validator.manifestRunner!.node.version,
    testAuth,
    url
  );
  const queryV = await imageVersions(
    validator.manifestRunner!.query.name,
    validator.manifestRunner!.query.version,
    testAuth,
    url
  );

  const endpoint = 'wss://polkadot.api.onfinality.io/public-ws';
  const dictEndpoint = processEndpoints(await dictionaryEndpoints(url), validator.chainId!)!;

  const project: V3DeploymentIndexerType = {
    cid: ipfs,
    dictEndpoint,
    endpoint,
    indexerImageVersion: indexerV[0],
    indexerAdvancedSettings: {
      indexer: {},
    },
  };

  return createDeployment(org, project_name, testAuth, ipfs, queryV[0], projectSpec.type, {}, [project], url);
}

// Replace/Update your access token when test locally
const testAuth = process.env.SUBQL_ACCESS_TOKEN_TEST!;
// Can be re-enabled when test env is ready
describe.skip('CLI deploy, delete, promote', () => {
  beforeAll(async () => {
    const {apiVersion, description, logoURl, org, projectName, repository, subtitle} = projectSpec;
    try {
      await createProject(
        org,
        subtitle,
        logoURl,
        1,
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
    let status: string | undefined;
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
    await expect(ipfsCID_validate('fake', testAuth, ROOT_API_URL_DEV)).rejects.toThrow(
      'Failed to validate IPFS CID: fake is not a valid subquery deployment id!'
    );
  });

  it('get DictEndpoint - polkadot', async () => {
    const validator = await ipfsCID_validate(projectSpec.ipfs, testAuth, ROOT_API_URL_DEV);
    const dict = await dictionaryEndpoints(ROOT_API_URL_DEV);
    expect(processEndpoints(dict, validator.chainId!)).toBe(
      'https://api.subquery.network/sq/subquery/polkadot-dictionary'
    );
  });

  it('reDeploy to Hosted Service', async () => {
    const {ipfs, org, projectName, type} = projectSpec;
    const newIPFS = 'QmbKvrzwSmzTZi5jrhEpa6yDDHQXRURi5S4ztLgJLpBxAi';
    const validator = await ipfsCID_validate(projectSpec.ipfs, testAuth, ROOT_API_URL_DEV);

    const deployOutput = await deployTestProject(validator, ipfs, org, projectName, testAuth, ROOT_API_URL_DEV);
    const initProjectInfo = await projectsInfo(testAuth, org, projectName, ROOT_API_URL_DEV, type);

    const endpoint = 'wss://polkadot.api.onfinality.io/public-ws';
    const dict = await dictionaryEndpoints(ROOT_API_URL_DEV);
    const indexerV = await imageVersions(
      validator.manifestRunner!.node.name,
      validator.manifestRunner!.node.version,
      testAuth,
      ROOT_API_URL_DEV
    );
    const queryV = await imageVersions(
      validator.manifestRunner!.query.name,
      validator.manifestRunner!.query.version,
      testAuth,
      ROOT_API_URL_DEV
    );

    const project = {
      cid: ipfs,
      dictEndpoint: processEndpoints(dict, validator.chainId!) ?? '',
      endpoint,
      indexerImageVersion: indexerV[0],
      indexerAdvancedSettings: {
        indexer: {},
      },
    };

    await updateDeployment(
      org,
      projectName,
      deployOutput.id,
      testAuth,
      newIPFS,
      queryV[0],
      {},
      [project],
      ROOT_API_URL_DEV
    );
    const updatedInfo = await projectsInfo(testAuth, org, projectName, ROOT_API_URL_DEV, type);

    expect(updatedInfo.id).toBe(initProjectInfo.id);
    expect(updatedInfo.version).not.toEqual(deployOutput.version);
  });
});
