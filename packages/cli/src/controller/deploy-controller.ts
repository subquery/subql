// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ROOT_API_URL_PROD} from '@subql/common';
import axios from 'axios';
import {deploymentDataType, validateDataType} from '../types';

export async function deployToHostedService(
  org: string,
  project_name: string,
  authToken: string,
  ipfsCID: string,
  indexerImageVersion: string,
  queryImageVersion: string,
  endpoint: string,
  type: string,
  dictEndpoint: string
): Promise<deploymentDataType> {
  const key = `${org}/${project_name}`;

  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'post',
        url: `${ROOT_API_URL_PROD}v2/subqueries/${key}/deployments`,
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
    throw new Error(`Failed to deploy to hosted service: ${e.message}`);
  }
}

export async function promoteDeployment(
  org: string,
  project_name: string,
  authToken: string,
  deploymentId: number
): Promise<string> {
  const key = `${org}/${project_name}`;
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'post',
      url: `${ROOT_API_URL_PROD}subqueries/${key}/deployments/${deploymentId}/release`,
    });
    return `${deploymentId}`;
  } catch (e) {
    throw new Error(`Failed to promote project: ${e.message}`);
  }
}

export async function deleteDeployment(
  org: string,
  project_name: string,
  authToken: string,
  deploymentId: number
): Promise<string> {
  const key = `${org}/${project_name}`;
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'delete',
      url: `${ROOT_API_URL_PROD}subqueries/${key}/deployments/${deploymentId}`,
    });
    return `${deploymentId}`;
  } catch (e) {
    throw new Error(`Failed to promote project: ${e.message}`);
  }
}

export async function deploymentStatus(
  org: string,
  project_name: string,
  authToken: string,
  deployID: number
): Promise<string> {
  const key = `${org}/${project_name}`;
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'get',
        url: `${ROOT_API_URL_PROD}subqueries/${key}/deployments/${deployID}/status`,
      })
    ).data;
    return `${result.status}`;
  } catch (e) {
    throw new Error(`Failed to get deployment status: ${e.message}`);
  }
}

export async function ipfsCID_validate(cid: string, authToken: string): Promise<validateDataType> {
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'post',
        url: `${ROOT_API_URL_PROD}ipfs/deployment-id/${cid}/validate`,
      })
    ).data;
    return result;
  } catch (e) {
    throw new Error('Invalid or Failed to validate IPFS CID');
  }
}

// get Dictionary Endpoint
// https://api.thechaindata.com/subqueries/dictionaries

interface endpointType {
  network: string;
  endpoint: string;
  chainId: string;
}

export async function getDictEndpoint(chainId: string): Promise<string> {
  try {
    const result = (
      await axios({
        method: 'get',
        url: `${ROOT_API_URL_PROD}subqueries/dictionaries`,
      })
    ).data;
    const filtered = result.find((endpoint: endpointType) => endpoint.chainId === chainId).endpoint;
    return filtered;
  } catch (e) {
    throw new Error(`Failed to get dictionary endpoint: ${e.message}`);
  }
}

export async function getEndpoint(chainId: string): Promise<string> {
  try {
    const result = (
      await axios({
        method: 'get',
        url: `${ROOT_API_URL_PROD}subqueries/network-endpoints`,
      })
    ).data;
    return result.find((endpoint: endpointType) => endpoint.chainId === chainId).endpoint;
  } catch (e) {
    throw new Error(`Failed to get endpoint: ${e.message}`);
  }
}

export async function getImage_v(name: string, version: string, authToken: string): Promise<string[]> {
  try {
    const result = (
      await axios({
        headers: {Authorization: `Bearer ${authToken}`},
        method: 'get',
        url: `${ROOT_API_URL_PROD}info/images/${encodeURIComponent(name)}?version=${encodeURIComponent(version)}`,
      })
    ).data;
    return result;
  } catch (e) {
    throw new Error(`Failed to get image: ${e.message}`);
  }
}
