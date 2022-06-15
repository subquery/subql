// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import axios from 'axios';
import {ROOT_API_URL_DEV, ROOT_API_URL_PROD} from '../constants';

interface createProjectType {
  key: string;
}
export async function createProject(
  organization: string,
  subtitle: string,
  logoUrl: string,
  project_name: string,
  authToken: string,
  gitRepository: string,
  description: string,
  apiVersion: string,
  url: string
): Promise<createProjectType> {
  try {
    const result = (
      await axios({
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        method: 'post',
        url: 'subqueries',
        baseURL: url,
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
    return result;
  } catch (e) {
    throw new Error(`Failed to create project: ${e.message}`);
  }
}

export async function deleteProject(
  authToken: string,
  organization: string,
  project_name: string,
  url: string
): Promise<string> {
  const key = `${organization}/${project_name}`;
  try {
    await axios({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'delete',
      url: `subqueries/${key}`,
      baseURL: url,
    });
    return `${key}`;
  } catch (e) {
    throw new Error(`Failed to delete project: ${e.message}`);
  }
}
