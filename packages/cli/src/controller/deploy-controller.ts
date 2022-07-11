// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import axios from 'axios';
import {deploymentDataType, validateDataType} from '../types';
import {errorHandle} from '../utils';

export async function deployToHostedService(
  org: string,
  project_name: string,
  authToken: string,
  ipfsCID: string,
  indexerImageVersion: string,
  queryImageVersion: string,
  endpoint: string,
  type: string,
  dictEndpoint: string,
  url: string
): Promise<deploymentDataType> {
  const key = `${org}/${project_name}`;
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'post',
        url: `v2/subqueries/${key}/deployments`,
        baseURL: url,
        data: {
          version: ipfsCID,
          dictEndpoint: dictEndpoint,
          endpoint: endpoint,
          advancedSettings: {
            '@subql/node': {},
            '@subql/query': {},
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
  project_name: string,
  authToken: string,
  deploymentId: number,
  url: string
): Promise<string> {
  const key = `${org}/${project_name}`;
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'post',
      url: `subqueries/${key}/deployments/${deploymentId}/release`,
      baseURL: url,
    });
    return `${deploymentId}`;
  } catch (e) {
    errorHandle(e, 'Failed to promote project:');
  }
}

export async function deleteDeployment(
  org: string,
  project_name: string,
  authToken: string,
  deploymentId: number,
  url: string
): Promise<string> {
  const key = `${org}/${project_name}`;
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'delete',
      url: `subqueries/${key}/deployments/${deploymentId}`,
      baseURL: url,
    });
    return `${deploymentId}`;
  } catch (e) {
    errorHandle(e, 'Failed to delete deployment:');
  }
}

export async function deploymentStatus(
  org: string,
  project_name: string,
  authToken: string,
  deployID: number,
  url: string
): Promise<string> {
  const key = `${org}/${project_name}`;
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'get',
        url: `subqueries/${key}/deployments/${deployID}/status`,
        baseURL: url,
      })
    ).data;
    return `${result.status}`;
  } catch (e) {
    errorHandle(e, 'Failed to get deployment status:');
  }
}

export async function ipfsCID_validate(cid: string, authToken: string, url: string): Promise<validateDataType> {
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

export async function getDictEndpoint(chainId: string, url: string): Promise<string> {
  try {
    const result = (
      await axios({
        method: 'get',
        url: `subqueries/dictionaries`,
        baseURL: url,
      })
    ).data;
    const filtered = result.find((endpoint: endpointType) => endpoint.chainId === chainId).endpoint;
    return filtered;
  } catch (e) {
    errorHandle(e, 'Failed to get dictionary endpoint:');
  }
}

export async function getEndpoint(chainId: string, url: string): Promise<string> {
  try {
    const result = (
      await axios({
        method: 'get',
        url: `subqueries/network-endpoints`,
        baseURL: url,
      })
    ).data;
    return result.find((endpoint: endpointType) => endpoint.chainId === chainId).endpoint;
  } catch (e) {
    errorHandle(e, 'Failed to get endpoint:');
  }
}

export async function getImage_v(name: string, version: string, authToken: string, url: string): Promise<string[]> {
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
interface endpointType {
  network: string;
  endpoint: string;
  chainId: string;
}
