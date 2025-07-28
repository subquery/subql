// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SQNetworks} from '@subql/network-config';
import {z} from 'zod';
import {getQueryClient, projectTypeSchema, gqlProjectTypeToProjectType} from './constants';
import {GetProjects} from './__graphql__/network/projects.generated';
import {GetProjectsQuery, GetProjectsQueryVariables} from './__graphql__/base-types';

export const projectSchema = z.object({
  id: z.string(),
  owner: z.string(),
  metadata: z.string(),
  totalAllocation: z.bigint(),
  totalBoost: z.bigint(),
  totalReward: z.bigint(),
  type: projectTypeSchema,
});
export type Project = z.infer<typeof projectSchema>;

export async function listProjects(network: SQNetworks, address: string): Promise<Project[]> {
  const res = await getQueryClient(network).query<GetProjectsQuery, GetProjectsQueryVariables>({
    query: GetProjects,
    variables: {address},
  });

  if (res.errors) {
    // logger.error(`Error fetching projects: ${res.errors.map((e) => e.message).join(', ')}`);
    throw new Error(`Failed to fetch projects for address ${address}`);
  }

  const projects = res.data?.projects?.nodes.map((p) => {
    if (!p) return null;
    const {__typename, type, ...rest} = p;
    return {
      ...rest,
      type: gqlProjectTypeToProjectType(type).toString(),
    };
  });

  return (projects ?? []).filter((p): p is Project => p !== null);
}
