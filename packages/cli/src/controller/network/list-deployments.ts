// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IPFS_NODE_ENDPOINT, IPFSHTTPClientLite} from '@subql/common';
import {SQNetworks} from '@subql/network-config';
import {z} from 'zod';
import {resultToBuffer} from '../../utils';
import {GetProjectDeploymentsQuery, GetProjectDeploymentsQueryVariables} from './__graphql__/base-types';
import {GetProjectDeployments} from './__graphql__/network/deployments.generated';
import {deploymentMetadataSchema, getQueryClient} from './constants';

export const deploymentSchema = z.object({
  deploymentId: z.string(),
  metadata: z.string(),
  meta: deploymentMetadataSchema.optional(),
  createdTimestamp: z.date(),
  createdBlock: z.union([z.number(), z.null()]), // TODO not sure why this is optional
  current: z.boolean(),
});

export type Deployment = z.infer<typeof deploymentSchema>;

export async function listDeployments(
  network: SQNetworks,
  projectId: string,
  ipfsEndpoint = IPFS_NODE_ENDPOINT
): Promise<Deployment[]> {
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

  const ipfs = new IPFSHTTPClientLite({url: ipfsEndpoint});

  const raw = res.data?.project?.deployments?.nodes ?? [];
  const deployments = await Promise.all(
    raw.map(async (d) => {
      if (!d) return null;
      const {__typename, id, ...rest} = d;

      return <Deployment>{
        deploymentId: id,
        ...rest,
        current: res.data?.project?.deploymentId === id,
        meta: await resultToBuffer(ipfs.cat(d.metadata))
          .then((data) => JSON.parse(data))
          .catch((e) => undefined), // Swallow the error
      };
    })
  );

  return deployments.filter((d): d is Deployment => d !== null);
}
