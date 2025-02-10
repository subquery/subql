// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import axios from 'axios';
import {CreateProject, ProjectDataType} from '../types';
import {errorHandle} from '../utils';

interface CreateProjectResponse {
  key: string;
}
export const suffixFormat = (value: string) => {
  return value
    .replace(/(^\s*)|(\s*$)/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

export async function getProject(url: string, authToken: string, key: string): Promise<ProjectDataType | undefined> {
  try {
    const res = await axios<ProjectDataType>({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'get',
      url: `/subqueries/${key}`,
      baseURL: url,
    });
    return res.data as unknown as ProjectDataType;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      return undefined;
    }

    console.log('ERRROR', e);
    throw errorHandle(e, 'Failed to get project:');
  }
}

export async function createProject(
  url: string,
  authToken: string,
  body: CreateProject
): Promise<CreateProjectResponse> {
  try {
    const res = await axios<CreateProjectResponse>({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: 'post',
      url: 'subqueries',
      baseURL: url,
      data: {
        gitRepository: '', // Deprecated
        ...body,
      },
    });
    return res.data as unknown as CreateProjectResponse;
  } catch (e) {
    throw errorHandle(e, 'Failed to create project:');
  }
}

export async function deleteProject(
  authToken: string,
  organization: string,
  project_name: string,
  url: string
): Promise<string> {
  const key = `${organization}/${project_name.toLowerCase()}`;
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
    throw errorHandle(e, 'Failed to delete project:');
  }
}
