// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import axios from 'axios';
import {
  DeploymentDataType,
  ProjectDataType,
  QueryAdvancedOpts,
  V3DeploymentIndexerType,
  V3DeploymentInput,
  ValidateDataType,
} from '../types';
import {buildProjectKey, errorHandle} from '../utils';

export async function createDeployment(
  org: string,
  projectName: string,
  authToken: string,
  ipfsCID: string,
  queryImageVersion: string,
  type: string,
  query: QueryAdvancedOpts,
  chains: V3DeploymentIndexerType[],
  url: string
): Promise<DeploymentDataType> {
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'post',
        url: `v3/subqueries/${buildProjectKey(org, projectName)}/deployments`,
        baseURL: url,
        data: {
          cid: ipfsCID,
          type: type,
          queryImageVersion: queryImageVersion,
          queryAdvancedSettings: {query},
          chains,
        } as V3DeploymentInput,
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

export async function updateDeployment(
  org: string,
  projectName: string,
  deployID: number,
  authToken: string,
  ipfsCID: string,
  queryVersion: string,
  query: QueryAdvancedOpts,
  chains: V3DeploymentIndexerType[],
  url: string
): Promise<void> {
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'put',
      url: `v3/subqueries/${buildProjectKey(org, projectName)}/deployments/${deployID}`,
      baseURL: url,
      data: {
        cid: ipfsCID,
        queryImageVersion: queryVersion,
        queryAdvancedSettings: {query},
        chains,
      } as V3DeploymentInput,
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
export function splitEndpoints(endpointStr: string): string[] {
  return endpointStr.split(',').map((e) => e.trim());
}
export interface EndpointType {
  network: string;
  endpoint: string;
  chainId: string;
}
