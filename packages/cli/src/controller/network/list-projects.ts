// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IPFS_NODE_ENDPOINT, IPFSHTTPClientLite} from '@subql/common';
import {SQNetworks} from '@subql/network-config';
import {z} from 'zod';
import {resultToBuffer} from '../../utils';
import {GetProjectsQuery, GetProjectsQueryVariables} from './__graphql__/base-types';
import {GetProjects} from './__graphql__/network/projects.generated';
import {getQueryClient, projectTypeSchema, gqlProjectTypeToProjectType, projectMetadataSchema} from './constants';

export const projectSchema = z.object({
  id: z.string(),
  owner: z.string(),
  metadata: z.string(),
  totalAllocation: z.bigint(),
  totalBoost: z.bigint(),
  totalReward: z.bigint(),
  type: projectTypeSchema,
  deploymentId: z.string(),
  meta: projectMetadataSchema.optional(),
});
export type Project = z.infer<typeof projectSchema>;

export async function listProjects(
  network: SQNetworks,
  address: string,
  ipfsEndpoint = IPFS_NODE_ENDPOINT
): Promise<Project[]> {
  const res = await getQueryClient(network).query<GetProjectsQuery, GetProjectsQueryVariables>({
    query: GetProjects,
    variables: {address},
  });

  if (res.errors) {
    // logger.error(`Error fetching projects: ${res.errors.map((e) => e.message).join(', ')}`);
    throw new Error(`Failed to fetch projects for address ${address}`);
  }

  const ipfs = new IPFSHTTPClientLite({url: ipfsEndpoint});

  const raw = res.data?.projects?.nodes ?? [];
  const projects = await Promise.all(
    raw.map(async (p) => {
      if (!p) return null;
      const {__typename, type, ...rest} = p;
      return <Project>{
        ...rest,
        type: gqlProjectTypeToProjectType(type) as any,
        meta: await resultToBuffer(ipfs.cat(p.metadata))
          .then((data) => JSON.parse(data))
          .catch((e) => undefined), // Swallow the error
      };
    })
  );

  return projects.filter((p): p is Project => p !== null);
}
