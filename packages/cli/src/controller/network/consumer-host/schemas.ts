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
  id: z.number({description: 'The unique identifier of the api key'}),
  name: z.string({description: 'The name given to the api key'}),
  apiKey: z.string({description: 'The key to use'}),
  times: z.number({description: 'The number of times the api key has been used'}),
  createdAt: z.string({description: 'ISO Date when the api key was created'}).datetime(),
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
  id: z.number({description: 'The unique identifier of the project'}),
  owner: z.string({description: 'The address that owns the project'}),
  metadata: z.string({description: 'The IPFS CID of the project metadata'}),
  ptype: z.number({description: 'An enum representing the project type'}), // TODO change to enum
  createdAt: z.string({description: 'ISO Date when the project was created'}).datetime(),
  updatedAt: z.string({description: 'ISO Date when the project was updated'}).datetime(),
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
  id: z.number({description: 'The unique identifier of the deployment'}),
  projectId: z.number({description: 'The unique identifier of the project this deployment belongs to'}),
  deployment: z.string({description: 'The IPFS CID of the deployment'}),
  isActivated: z.boolean({}),
  isLatest: z.boolean({description: 'Whether this deployment is the latest for the project'}),
  metadata: z.string({description: 'The IPFS CID of the deployment metadata'}),
  createdAt: z.string({description: 'ISO Date when the deployment was created'}).datetime(),
  updatedAt: z.string({description: 'ISO Date when the deployment was updated'}).datetime(),
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
  id: z.number({description: 'The unique identifier of the hosting plan'}),
  consumer: z.number({description: 'The wallet address that consumes the plan'}),
  channels: z.string(),
  deploymentId: z.number({description: 'The deployment id that is hosted'}),
  maximum: z.number(),
  spent: z.string({description: 'The amount spent in SQT'}),
  price: z.string({description: 'The price per 1000 requests in SQT'}),
  isActivated: z.boolean({description: 'Whether the plan is still active'}),
  expiredAt: z.string({description: 'ISO Date when the hosting plan expires'}).datetime(),
  createdAt: z.string({description: 'ISO Date when the hosting plan was created'}).datetime(),
  updatedAt: z.string({description: 'ISO Date when the hosting plan was updated'}).datetime(),
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
