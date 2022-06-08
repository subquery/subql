// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import axios from 'axios';

export async function deployToHostedService(
  key: string,
  authToken: string,
  ipfsCID: string,
  indexerImageVersion?: string,
  queryImageVersion?: string,
  endpoint?: string,
  type?: string,
  dictEndpoint?: string
): Promise<string> {
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'post',
        url: `https://api.thechaindata.com/v2/subqueries/${key}/deployments`,
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
    return `Success, Delployment ID: ${result.deployment.id}`;
  } catch (e) {
    throw new Error(`Failed to deploy to hosted service: ${e.message}`);
  }
}

export async function promoteDeployment(key: string, authToken: string, deploymentId: number): Promise<string> {
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'post',
      url: `https://api.thechaindata.com/subqueries/${key}/deployments/${deploymentId}/release`,
    });
    return `Success, Deployment ${deploymentId} has been promote from Stage to Production`;
  } catch (e) {
    throw new Error(`Failed to promote project: ${e.message}`);
  }
}

export async function deleteDeployment(key: string, authToken: string, deploymentId: number): Promise<string> {
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'delete',
      url: `https://api.thechaindata.com/subqueries/${key}/deployments/${deploymentId}`,
    });
    return `Success, Deployment ${deploymentId} has been deleted from Hosted Service`;
  } catch (e) {
    throw new Error(`Failed to promote project: ${e.message}`);
  }
}
