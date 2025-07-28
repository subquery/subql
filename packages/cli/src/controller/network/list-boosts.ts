// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SQNetworks} from '@subql/network-config';
import {z} from 'zod';
import {GetDeploymentBoostQuery, GetDeploymentBoostQueryVariables} from './__graphql__/base-types';
import {GetDeploymentBoost} from './__graphql__/network/deploymentsBooster.generated';
import {getQueryClient} from './constants';

export const boostsSchema = z.object({
  totalAmount: z.bigint({description: 'The amount of SQT boosted'}),
  consumer: z.string({description: 'The account that made the boost'}),
});
export type Boosts = z.infer<typeof boostsSchema>;

export const responseSchema = z.object({
  boosts: z.array(boostsSchema),
  totalBoost: z.bigint(),
});
export type Response = z.infer<typeof responseSchema>;

export async function listBoosts(network: SQNetworks, deploymentId: string): Promise<Response> {
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

  const boosts = res.data.deploymentBoosterSummaries.nodes.map((boost) => {
    if (!boost) return null;
    const {__typename, ...rest} = boost;

    return rest;
  });

  const totalBoost = res.data.deploymentBoosterSummaries.aggregates?.sum?.totalAmount ?? 0n;

  return {
    boosts: boosts.filter((b) => b !== null),
    totalBoost,
  };
}
