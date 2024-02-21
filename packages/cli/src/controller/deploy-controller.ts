// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Axios} from 'axios';
import {
  DeploymentDataType,
  ProjectDataType,
  QueryAdvancedOpts,
  V3DeploymentIndexerType,
  V3DeploymentInput,
  ValidateDataType,
} from '../types';
import {buildProjectKey, errorHandle} from '../utils';

function getAxiosInstance(url: string, authToken?: string): Axios {
  const headers: Record<string, string> = {};

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return new Axios({
    baseURL: url,
    headers,
  });
}

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
    const res = await getAxiosInstance(url, authToken).post(
      `v3/subqueries/${buildProjectKey(org, projectName)}/deployments`,
      {
        cid: ipfsCID,
        type: type,
        queryImageVersion: queryImageVersion,
        queryAdvancedSettings: {query},
        chains,
      } as V3DeploymentInput
    );
    return res.data.deployment;
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
    await getAxiosInstance(url, authToken).post(
      `subqueries/${buildProjectKey(org, projectName)}/deployments/${deploymentId}/release`
    );
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
    await getAxiosInstance(url, authToken).delete(
      `subqueries/${buildProjectKey(org, projectName)}/deployments/${deploymentId}`
    );
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
    const res = await getAxiosInstance(url, authToken).get<{status: string}>(
      `subqueries/${buildProjectKey(org, projectName)}/deployments/${deployID}/status`
    );
    return `${res.data.status}`;
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
    const res = await getAxiosInstance(url, authToken).get<ProjectDataType[]>(
      `subqueries/${buildProjectKey(org, projectName)}/deployments`
    );
    return res.data.find((element) => element.projectKey === `${key}` && element.type === type);
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
    await getAxiosInstance(url, authToken).put(
      `v3/subqueries/${buildProjectKey(org, projectName)}/deployments/${deployID}`,
      {
        cid: ipfsCID,
        queryImageVersion: queryVersion,
        queryAdvancedSettings: {query},
        chains,
      } as V3DeploymentInput
    );
  } catch (e) {
    errorHandle(e, `Failed to redeploy project: ${e.message}`);
  }
}
export async function ipfsCID_validate(cid: string, authToken: string, url: string): Promise<ValidateDataType> {
  try {
    const res = await getAxiosInstance(url, authToken).post<ValidateDataType>(`ipfs/deployment-id/${cid}/validate`);

    if (res.status === 500) {
      throw new Error((res.data as unknown as {message: string}).message);
    }

    return res.data;
  } catch (e) {
    errorHandle(e, 'Failed to validate IPFS CID:');
  }
}

export async function dictionaryEndpoints(url: string): Promise<EndpointType[]> {
  try {
    const res = await getAxiosInstance(url).get<EndpointType[]>(`subqueries/dictionaries`);

    return res.data;
  } catch (e) {
    errorHandle(e, 'Failed to get dictionary endpoint:');
  }
}

export function processEndpoints(endpoints: EndpointType[], chainId: string): string | undefined {
  return endpoints.find((endpoint: EndpointType) => endpoint.chainId === chainId)?.endpoint;
}

export async function imageVersions(name: string, version: string, authToken: string, url: string): Promise<string[]> {
  try {
    const res = await getAxiosInstance(url, authToken).get<string[]>(
      `info/images/${encodeURIComponent(name)}?version=${encodeURIComponent(version)}`
    );
    return res.data;
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
