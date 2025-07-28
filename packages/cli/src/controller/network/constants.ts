// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {JsonRpcProvider} from '@ethersproject/providers';
import {ProjectType, ContractSDK, networks} from '@subql/contract-sdk';
import {GraphqlQueryClient} from '@subql/network-clients/dist/clients/queryClient';
import {NETWORK_CONFIGS, SQNetworks} from '@subql/network-config';
import {ContractReceipt, ContractTransaction} from 'ethers';
import {z} from 'zod';
import {ProjectType as ProjectTypeGql} from './__graphql__/base-types';

export function getQueryClient(network: SQNetworks) {
  return new GraphqlQueryClient(NETWORK_CONFIGS[network]).networkClient;
}

export const networkNames = Object.keys(networks) as [SQNetworks, ...SQNetworks[]];
export const networkNameSchema = z
  .enum<SQNetworks, typeof networkNames>(networkNames, {description: 'The network to check.'})
  .default(networkNames[0]);

type ProjectTypeString = keyof typeof ProjectType;
export const projectTypes = Object.keys(ProjectType) as [ProjectTypeString, ...ProjectTypeString[]];
export const projectTypeSchema = z.enum<ProjectTypeString, [ProjectTypeString, ...ProjectTypeString[]]>(projectTypes);

export function gqlProjectTypeToProjectType(projectType: ProjectTypeGql): ProjectType {
  switch (projectType) {
    case ProjectTypeGql.SUBQUERY:
      return ProjectType.SUBQUERY;
    case ProjectTypeGql.SQ_DICT:
      return ProjectType.SQ_DICT;
    case ProjectTypeGql.SUBGRAPH:
      return ProjectType.SUBGRAPH;
    case ProjectTypeGql.RPC:
      return ProjectType.RPC;
    default:
      // TODO graphql has a LLM type but network SDK does not
      throw new Error(`Unsupported project type: ${projectType}`);
  }
}

export function getContractSDK(network: SQNetworks, rpcUrl?: string): ContractSDK {
  const config = NETWORK_CONFIGS[network];
  const endpoint = rpcUrl ?? config.defaultEndpoint;

  if (!endpoint) {
    throw new Error(`No predefined RPC URL for network ${network}. Please provide a custom RPC URL.`);
  }

  const provider = new JsonRpcProvider();

  return new ContractSDK(provider, {network});
}

export const projectMetadataSchema = z.object({
  name: z.string(),
  image: z.string().optional(),
  description: z.string().default('').optional(),
  websiteUrl: z.string().optional(), // URL
  codeUrl: z.string().optional(), // URL
  versionDescription: z.string().default('').optional(),
  categories: z.array(z.string()).max(2),
});
export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;

export const deploymentMetadataSchema = z.object({
  version: z.string(), // TODO lock to semver
  description: z.string({description: 'Description of this deployment.'}),
  // These fields never seem to be set: https://github.com/subquery/network-app/blob/main/src/hooks/useCreateProject.tsx#L28-L31
  // websiteUrl: z.string({description: 'Url to the project website'}),
  // codeUrl: z.string({description: 'Url to where the source code for this deployment is'}),
});
export type DeploymentMetadata = z.infer<typeof deploymentMetadataSchema>;

export async function checkTransactionSuccess(transaction: ContractTransaction): Promise<ContractReceipt> {
  const receipt = await transaction.wait();
  if (receipt.status) {
    return receipt;
  }
  throw new Error(`Transaction failed. Hash="${transaction.hash}"`);
}
