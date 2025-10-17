// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IPFSHTTPClientLite, IPFS_NODE_ENDPOINT} from '@subql/common';
import {SQNetworks} from '@subql/network-config';
import {utils} from 'ethers';
import {z} from 'zod';
import {resultToJson} from '../../utils';
import {GetAccountBoostQuery, GetAccountBoostQueryVariables} from './__graphql__/base-types';
import {GetAccountBoost} from './__graphql__/network/deploymentsBooster.generated';
import {deploymentMetadataSchema, getQueryClient, projectMetadataSchema} from './constants';

export const boostsSchema = z.object({
  totalAmount: z.string({description: 'The amount of SQT boosted'}), // bigint
  deploymentId: z.string({description: 'DeploymentId that is being boosted'}),
  projectId: z.string({description: 'The id of the deployments project'}),
  projectMeta: projectMetadataSchema.optional(),
  deploymentMeta: deploymentMetadataSchema.optional(),
});
export type Boosts = z.infer<typeof boostsSchema>;

export const responseSchema = z.object({
  boosts: z.array(boostsSchema),
  totalBoost: z.string(), //bigint
});
export type Response = z.infer<typeof responseSchema>;

export async function listAccountBoosts(
  network: SQNetworks,
  address: string,
  ipfsEndpoint = IPFS_NODE_ENDPOINT
): Promise<Response> {
  const res = await getQueryClient(network).query<GetAccountBoostQuery, GetAccountBoostQueryVariables>({
    query: GetAccountBoost,
    variables: {address: utils.getAddress(address)},
  });

  if (res.errors) {
    throw new Error(`Failed to fetch boosts for account ${address}`);
  }

  if (!res.data?.deploymentBoosterSummaries) {
    throw new Error(`Booster summaries for account ${address} not found`);
  }

  const ipfs = new IPFSHTTPClientLite({url: ipfsEndpoint});

  const boosts = await Promise.all(
    res.data.deploymentBoosterSummaries.nodes.map(async (boost) => {
      if (!boost) return null;
      const {__typename, deployment, project, ...rest} = boost;

      return {
        projectId: project?.id ?? 'Unknown',
        ...rest,
        deploymentMeta: deployment ? await resultToJson(ipfs.cat(deployment.metadata), true) : undefined,
        projectMeta: project ? await resultToJson(ipfs.cat(project.metadata), true) : undefined,
      } satisfies Boosts;
    })
  );

  const totalBoost = res.data.deploymentBoosterSummaries.aggregates?.sum?.totalAmount ?? '0';

  return {
    boosts: boosts.filter((b) => b !== null),
    totalBoost,
  };
}
