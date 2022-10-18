// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import axios from 'axios';
import {DeploymentDataType, ProjectDataType, ValidateDataType} from '../types';
import {buildProjectKey, errorHandle} from '../utils';

export async function deployToHostedService(
  org: string,
  projectName: string,
  authToken: string,
  ipfsCID: string,
  indexerImageVersion: string,
  queryImageVersion: string,
  endpoint: string,
  type: string,
  dictEndpoint: string,
  query: object,
  indexer: object,
  url: string
): Promise<DeploymentDataType> {
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'post',
        url: `v2/subqueries/${buildProjectKey(org, projectName)}/deployments`,
        baseURL: url,
        data: {
          version: ipfsCID,
          dictEndpoint: dictEndpoint,
          endpoint: endpoint,
          advancedSettings: {
            query: query,
            indexer: indexer,
          },
          indexerImageVersion: indexerImageVersion,
          queryImageVersion: queryImageVersion,
          type: type,
        },
      })
    ).data;
    return result.deployment;
  } catch (e) {
    errorHandle(e, 'Error deploying to hosted service:');
  }
}

export async function promoteDeployment(
  org: string,
  projectName: string,
  authToken: string,
  deploymentId: number,
  url: string
): Promise<string> {
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'post',
      url: `subqueries/${buildProjectKey(org, projectName)}/deployments/${deploymentId}/release`,
      baseURL: url,
    });
    return `${deploymentId}`;
  } catch (e) {
    errorHandle(e, 'Failed to promote project:');
  }
}

export async function deleteDeployment(
  org: string,
  projectName: string,
  authToken: string,
  deploymentId: number,
  url: string
): Promise<string> {
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'delete',
      url: `subqueries/${buildProjectKey(org, projectName)}/deployments/${deploymentId}`,
      baseURL: url,
    });
    return `${deploymentId}`;
  } catch (e) {
    errorHandle(e, 'Failed to delete deployment:');
  }
}

export async function deploymentStatus(
  org: string,
  projectName: string,
  authToken: string,
  deployID: number,
  url: string
): Promise<string> {
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'get',
        url: `subqueries/${buildProjectKey(org, projectName)}/deployments/${deployID}/status`,
        baseURL: url,
      })
    ).data;
    return `${result.status}`;
  } catch (e) {
    errorHandle(e, 'Failed to get deployment status:');
  }
}

export async function projectsInfo(
  authToken: string,
  org: string,
  projectName: string,
  url: string,
  type: string
): Promise<ProjectDataType> {
  const key = `${org}/${projectName}`;
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'get',
        url: `subqueries/${buildProjectKey(org, projectName)}/deployments`,
        baseURL: url,
      })
    ).data;
    return result.find((element: ProjectDataType) => element.projectKey === `${key}` && element.type === type);
  } catch (e) {
    errorHandle(e, 'Failed to get projects:');
  }
}

export async function redeploy(
  org: string,
  projectName: string,
  deployID: number,
  authToken: string,
  ipfsCID: string,
  endpoint: string,
  dictEndpoint: string,
  indexerVersion: string,
  queryVersion: string,
  query: object,
  indexer: object,
  url: string
): Promise<void> {
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'put',
      url: `v2/subqueries/${buildProjectKey(org, projectName)}/deployments/${deployID}`,
      baseURL: url,
      data: {
        version: ipfsCID,
        dictEndpoint: dictEndpoint,
        endpoint: endpoint,
        indexerImageVersion: indexerVersion,
        queryImageVersion: queryVersion,
        advancedSettings: {
          query: query,
          indexer: indexer,
        },
      },
    });
  } catch (e) {
    errorHandle(e, `Failed to redeploy project: ${e.message}`);
  }
}
export async function ipfsCID_validate(cid: string, authToken: string, url: string): Promise<ValidateDataType> {
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'post',
        url: `ipfs/deployment-id/${cid}/validate`,
        baseURL: url,
      })
    ).data;
    return result;
  } catch (e) {
    errorHandle(e, 'Failed to validate IPFS CID:');
  }
}

export async function dictionaryEndpoints(url: string): Promise<EndpointType[]> {
  try {
    const result = (
      await axios({
        method: 'get',
        url: `subqueries/dictionaries`,
        baseURL: url,
      })
    ).data;
    return result;
  } catch (e) {
    errorHandle(e, 'Failed to get dictionary endpoint:');
  }
}

export async function networkEndpoints(url: string): Promise<EndpointType[]> {
  try {
    const result = (
      await axios({
        method: 'get',
        url: `subqueries/network-endpoints`,
        baseURL: url,
      })
    ).data;
    return result;
  } catch (e) {
    errorHandle(e, 'Failed to get endpoint:');
  }
}

export function processEndpoints(endpoints: EndpointType[], chainId: string): string | undefined {
  return endpoints.find((endpoint: EndpointType) => endpoint.chainId === chainId)?.endpoint;
}

export async function imageVersions(name: string, version: string, authToken: string, url: string): Promise<string[]> {
  try {
    const result = (
      await axios({
        headers: {Authorization: `Bearer ${authToken}`},
        method: 'get',
        url: `info/images/${encodeURIComponent(name)}?version=${encodeURIComponent(version)}`,
        baseURL: url,
      })
    ).data;
    return result;
  } catch (e) {
    errorHandle(e, 'Failed to get image:');
  }
}
interface EndpointType {
  network: string;
  endpoint: string;
  chainId: string;
}
