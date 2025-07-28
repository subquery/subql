// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SQNetworks} from '@subql/network-config';
import {z} from 'zod';
import {GetProjectDeploymentsQuery, GetProjectDeploymentsQueryVariables} from './__graphql__/base-types';
import {GetProjectDeployments} from './__graphql__/network/deployments.generated';
import {getQueryClient} from './constants';

export const deploymentSchema = z.object({
  projectId: z.string(),
  metadata: z.string(),
  createdTimestamp: z.date(),
  createdBlock: z.union([z.number(), z.null()]), // TODO not sure why this is optional
});

export type Deployment = z.infer<typeof deploymentSchema>;

export async function listDeployments(network: SQNetworks, projectId: string): Promise<Deployment[]> {
  const res = await getQueryClient(network).query<GetProjectDeploymentsQuery, GetProjectDeploymentsQueryVariables>({
    query: GetProjectDeployments,
    variables: {projectId},
  });

  if (res.errors) {
    throw new Error(`Failed to fetch deployments for project ${projectId}`);
  }

  if (!res.data?.project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }

  const deployments = res.data?.project?.deployments?.nodes.map((d) => {
    if (!d) return null;
    const {__typename, id, ...rest} = d;

    return rest;
  });

  return (deployments ?? []).filter((d): d is Deployment => d !== null);
}
