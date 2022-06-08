// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {CREATE_PROJECT_URL} from '@subql/common';
import axios from 'axios';

export async function createProject(
  organization: string,
  subtitle: string,
  logoUrl: string,
  project_name: string,
  authToken: string,
  gitRepository: string,
  description: string,
  apiVersion: string
): Promise<string> {
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'post',
        url: CREATE_PROJECT_URL,
        data: {
          apiVersion: `v${apiVersion}`,
          description: description,
          gitRepository: gitRepository,
          key: `${organization}/${project_name}`,
          logoUrl: logoUrl,
          name: project_name,
          subtitle: subtitle,
        },
      })
    ).data;
    return `Success!
            \n project has been created.
            \nProject key: ${result.key}`;
  } catch (e) {
    throw new Error(`Failed to create project: ${e.message}`);
  }
}

export async function deleteProject(authToken: string, organization: string, project_name: string): Promise<string> {
  const key = `${organization}/${project_name}`;
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'delete',
      url: `https://api.thechaindata.com/subqueries/${key}`,
    });
    return `Success!
            \n project: ${key} has been deleted.`;
  } catch (e) {
    throw new Error(`Failed to delete project: ${e.message}`);
  }
}
