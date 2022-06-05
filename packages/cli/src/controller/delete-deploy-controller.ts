// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import axios from 'axios';

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
