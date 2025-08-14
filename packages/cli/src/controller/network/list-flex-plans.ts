// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IPFS_NODE_ENDPOINT, IPFSHTTPClientLite} from '@subql/common';
import {SQNetworks} from '@subql/network-config';
import {z} from 'zod';
import {resultToJson} from '../../utils';
import {GetFlexPlansQuery, GetFlexPlansQueryVariables} from './__graphql__/base-types';
import {GetFlexPlans} from './__graphql__/network/flexPlan.generated';
import {deploymentMetadataSchema, getQueryClient, projectMetadataSchema} from './constants';

export const planSchema = z.object({
  id: z.string(),
  price: z.string(), // bigint
  period: z.string(), // bigint
  dailyReqCap: z.string(), // bigint
  rateLimit: z.string(), // bigint
  priceToken: z.string(),
  planTemplateMetadata: z
    .object({
      name: z.string(),
      period: z.string(),
      description: z.string(),
    })
    .optional(),
  deploymentId: z.string(),
  deploymentMeta: deploymentMetadataSchema.optional(),
  projectId: z.string(),
  projectMeta: projectMetadataSchema.optional(),
});
export type Plan = z.infer<typeof planSchema>;

export const responseSchema = z.object({
  plans: z.array(planSchema),
});
export type Response = z.infer<typeof responseSchema>;

export async function listFlexPlans(
  network: SQNetworks,
  address: string,
  ipfsEndpoint = IPFS_NODE_ENDPOINT
): Promise<Response> {
  const res = await getQueryClient(network).query<GetFlexPlansQuery, GetFlexPlansQueryVariables>({
    query: GetFlexPlans,
    variables: {address},
  });

  if (res.errors) {
    throw new Error(`Failed to fetch flex plans for address ${address}`);
  }

  if (!res.data?.plans) {
    throw new Error(`Flex plans for address ${address} not found`);
  }

  const ipfs = new IPFSHTTPClientLite({url: ipfsEndpoint});

  const plans = await Promise.all(
    res.data.plans.nodes.map(async (boost) => {
      if (!boost) return null;
      const {__typename, deployment, planTemplate, ...rest} = boost;
      if (!planTemplate) {
        throw new Error(`Expected plan template to exist on plan ${rest.id}`);
      }

      const {__typename: _, metadata: templateMetadata, ...template} = planTemplate;

      return {
        ...rest,
        ...template,
        deploymentId: rest.deploymentId ?? '',
        projectId: deployment?.project?.id ?? '',
        planTemplateMetadata: templateMetadata ? await resultToJson(ipfs.cat(templateMetadata), true) : undefined,
        deploymentMeta: deployment ? await resultToJson(ipfs.cat(deployment.metadata), true) : undefined,
        projectMeta: deployment?.project?.metadata
          ? await resultToJson(ipfs.cat(deployment.project.metadata), true)
          : undefined,
      } satisfies Plan;
    })
  );

  return {
    plans: plans.filter((b) => b !== null),
  };
}
