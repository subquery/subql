// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SQNetworks} from '@subql/network-config';
import {z} from 'zod';
import {GetDeploymentBoostQuery, GetDeploymentBoostQueryVariables} from './__graphql__/base-types';
import {GetDeploymentBoost} from './__graphql__/network/deploymentsBooster.generated';
import {cidToBytes32, getContractSDK, getQueryClient, getRpcProvider} from './constants';

export const boostsSchema = z.object({
  totalAmount: z.string({description: 'The amount of SQT boosted'}), // bigint
  consumer: z.string({description: 'The account that made the boost'}),
  rewards: z.string({description: 'The amount of rewards'}), // bigint
});
export type Boosts = z.infer<typeof boostsSchema>;

export const responseSchema = z.object({
  boosts: z.array(boostsSchema),
  totalBoost: z.string({description: 'The total SQT boosted on this deployment'}), //bigint
});
export type Response = z.infer<typeof responseSchema>;

export async function listDeploymentBoosts(network: SQNetworks, deploymentId: string): Promise<Response> {
  const contracts = getContractSDK(await getRpcProvider(network), network);
  const res = await getQueryClient(network).query<GetDeploymentBoostQuery, GetDeploymentBoostQueryVariables>({
    query: GetDeploymentBoost,
    variables: {deploymentId},
  });

  if (res.errors) {
    throw new Error(`Failed to fetch boosts for deployment ${deploymentId}`);
  }

  if (!res.data?.deploymentBoosterSummaries) {
    throw new Error(`Booster summaries for deployment ${deploymentId} not found`);
  }

  const deploymentIdBytes32 = cidToBytes32(deploymentId);

  const boosts = await Promise.all(
    res.data.deploymentBoosterSummaries.nodes.map(async (boost) => {
      if (!boost) return null;
      const {__typename, ...rest} = boost;

      return {
        ...rest,
        rewards: await contracts.rewardsBooster
          .getAccQueryRewardsByType(deploymentIdBytes32, rest.consumer)
          .then((r) => r.toString()),
      };
    })
  );

  const totalBoost = res.data.deploymentBoosterSummaries.aggregates?.sum?.totalAmount ?? '0';

  return {
    boosts: boosts.filter((b) => b !== null),
    totalBoost,
  };
}
