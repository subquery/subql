// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import axios from 'axios';
import {errorHandle} from '../utils';

interface createProjectType {
  key: string;
}
export const suffixFormat = (value: string) => {
  return value
    .replace(/(^\s*)|(\s*$)/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
};
export async function createProject(
  organization: string,
  subtitle: string,
  logoUrl: string,
  project_name: string,
  authToken: string,
  gitRepository: string,
  description: string,
  apiVersion: string,
  dedicateDB: string | undefined,
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
          key: `${organization}/${suffixFormat(project_name)}`,
          logoUrl: logoUrl,
          name: project_name,
          subtitle: subtitle,
          dedicateDBKey: dedicateDB,
        },
      })
    ).data;
    return result;
  } catch (e) {
    errorHandle(e, 'Failed to create project:');
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
    errorHandle(e, 'Failed to delete project:');
  }
}
