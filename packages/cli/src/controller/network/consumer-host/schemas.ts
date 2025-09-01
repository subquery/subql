// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {z} from 'zod';
import {
  Apikey,
  HostingPlan as ApiHostingPlan,
  HostingPlanList as ApiHostingPlanList,
  Project as ApiProject,
  Deployment as ApiDeployment,
} from './consumer-host-service-api';

export const apiKeySchema = z.object({
  id: z.number(),
  name: z.string(),
  apiKey: z.string(),
  times: z.number(),
  createdAt: z.string().datetime(),
});
export type ApiKey = z.infer<typeof apiKeySchema>;

export function convertApiKey(apiKey: Apikey): ApiKey {
  return apiKeySchema.parse({
    id: apiKey.id,
    name: apiKey.name,
    apiKey: apiKey.value,
    times: apiKey.times,
    createdAt: `${apiKey.created_at}Z`, // The server returns a local timestamp, and seems to use UTC
  });
}

export const projectSchema = z.object({
  id: z.number(),
  owner: z.string(),
  metadata: z.string(),
  ptype: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Project = z.infer<typeof projectSchema>;

export function convertProject(project: ApiProject): Project {
  return projectSchema.parse({
    id: project.id,
    owner: project.owner,
    metadata: project.metadata,
    ptype: project.ptype,
    createdAt: `${project.created_at}Z`,
    updatedAt: `${project.updated_at}Z`,
  });
}

export const deploymentSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  deployment: z.string(),
  isActivated: z.boolean(),
  isLatest: z.boolean(),
  metadata: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Deployment = z.infer<typeof deploymentSchema>;

export function convertDeployment(deployment: ApiDeployment): Deployment {
  return deploymentSchema.parse({
    id: deployment.id,
    projectId: deployment.project_id,
    deployment: deployment.deployment,
    isActivated: deployment.is_actived,
    isLatest: deployment.is_latest,
    metadata: deployment.metadata,
    createdAt: `${deployment.created_at}Z`,
    updatedAt: `${deployment.updated_at}Z`,
  });
}

export const hostingPlanSchema = z.object({
  id: z.number(),
  consumer: z.number(),
  channels: z.string(),
  deploymentId: z.number(),
  maximum: z.number(),
  spent: z.string(),
  price: z.string(),
  isActivated: z.boolean(),
  expiredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type HostingPlan = z.infer<typeof hostingPlanSchema>;

export const hostingPlanExtraSchema = hostingPlanSchema.extend({
  project: projectSchema,
  deployment: deploymentSchema,
});
export type HostingPlanExtra = z.infer<typeof hostingPlanExtraSchema>;

export function convertHostingPlan(plan: ApiHostingPlan): HostingPlan {
  return hostingPlanSchema.parse({
    id: plan.id,
    consumer: plan.user_id,
    channels: plan.channels,
    deploymentId: plan.deployment_id,
    maximum: plan.maximum,
    price: plan.price,
    spent: plan.spent,
    isActivated: plan.is_actived,
    expiredAt: `${plan.expired_at}Z`,
    createdAt: `${plan.created_at}Z`,
    updatedAt: `${plan.updated_at}Z`,
  });
}

export function convertHostingPlanExtra(plan: ApiHostingPlanList): HostingPlanExtra {
  return hostingPlanExtraSchema.parse({
    ...convertHostingPlan(plan),
    project: convertProject(plan.project),
    deployment: convertDeployment(plan.deployment),
  });
}
