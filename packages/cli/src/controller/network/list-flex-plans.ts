// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IPFSHTTPClientLite, IPFS_NODE_ENDPOINT} from '@subql/common';
import {DeploymentMetadata, deploymentMetadataSchema, ProjectMetadata, projectMetadataSchema} from './constants';
import {hostingPlanSchema} from './consumer-host/schemas';

import {z} from 'zod';
import {ConsumerHostClient} from './consumer-host/client';
import {resultToJson} from '../../utils';

export const metaHostingPlanSchema = hostingPlanSchema.extend({
  deploymentMeta: deploymentMetadataSchema.optional(),
  projectMetadata: projectMetadataSchema.optional(),
});

export type MetaHostingPlan = z.infer<typeof metaHostingPlanSchema>;

export async function listFlexPlans(
  chs: ConsumerHostClient,
  ipfsEndpoint = IPFS_NODE_ENDPOINT
): Promise<MetaHostingPlan[]> {
  const plans = await chs.listPlans();

  const ipfs = new IPFSHTTPClientLite({url: ipfsEndpoint});

  const metaPlans = await Promise.all(
    plans.map(async (plan) => {
      const deploymentMeta = await resultToJson<DeploymentMetadata, true>(ipfs.cat(plan.deployment.metadata), true);
      const projectMetadata = await resultToJson<ProjectMetadata, true>(ipfs.cat(plan.project.metadata), true);

      return {
        ...plan,
        deploymentMeta,
        projectMetadata,
      } satisfies MetaHostingPlan;
    })
  );

  return metaPlans;
}
