// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import axios from 'axios';

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
