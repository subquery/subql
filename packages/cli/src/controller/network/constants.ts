// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {keccak256} from '@ethersproject/keccak256';
import {JsonRpcProvider, Provider} from '@ethersproject/providers';
import {toUtf8Bytes} from '@ethersproject/strings';
import {Wallet} from '@ethersproject/wallet';
import {ProjectType, ContractSDK, networks} from '@subql/contract-sdk';
import {GraphqlQueryClient} from '@subql/network-clients/dist/clients/queryClient';
import {NETWORK_CONFIGS, SQNetworks} from '@subql/network-config';
import {ContractReceipt, ContractTransaction, Signer} from 'ethers';
import {formatEther} from 'ethers/lib/utils';
import {z} from 'zod';
import {Logger} from '../../adapters/utils';
import {ProjectType as ProjectTypeGql} from './__graphql__/base-types';
import {NO_EXISTING_CONN_ERROR, walletConnectSigner} from './walletconnect-signer';

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

async function getRpcProvider(network: SQNetworks, rpcUrl?: string): Promise<JsonRpcProvider> {
  const config = NETWORK_CONFIGS[network];
  const endpoint = rpcUrl ?? config.defaultEndpoint;

  if (!endpoint) {
    throw new Error(`No predefined RPC URL for network ${network}. Please provide a custom RPC URL.`);
  }
  const provider = new JsonRpcProvider(endpoint);

  await provider.ready;

  return provider;
}

export async function getSignerOrProvider(
  network: SQNetworks,
  logger: Logger,
  rpcUrl?: string,
  allowNewWalletConnect = false
): Promise<Signer | Provider> {
  const provider = await getRpcProvider(network, rpcUrl);
  const privateKey = process.env.SUBQL_PRIVATE_KEY;
  if (privateKey) {
    return new Wallet(privateKey, provider);
  }

  const signer = walletConnectSigner.getInstance(provider, logger, allowNewWalletConnect);

  // Will return wallet connect if there is an existing connection, otherwise the provider
  try {
    await signer.getAddress();
    return signer;
  } catch (e: any) {
    if (e === NO_EXISTING_CONN_ERROR) {
      return provider;
    }
    throw e;
  }
}

export function isSigner(signerOrProvider: Signer | Provider): signerOrProvider is Signer {
  return typeof (signerOrProvider as Signer).getAddress === 'function';
}

export function getContractSDK(signerOrProvider: Signer | Provider, network: SQNetworks): ContractSDK {
  return new ContractSDK(signerOrProvider, {network});
}

export function requireSigner(signerOrProvider: Signer | Provider): asserts signerOrProvider is Signer {
  if (!isSigner(signerOrProvider)) {
    throw new Error(
      'A wallet is required for this. Please provide a private key via environment variables or enable Wallet Connect.'
    );
  }
}

export async function resolveAddress(
  network: SQNetworks,
  logger: Logger,
  rpcUrl?: string,
  address?: string,
  allowNewWalletConnect = false
): Promise<string> {
  if (address) return address;

  const signerOrProvider = await getSignerOrProvider(network, logger, rpcUrl, allowNewWalletConnect);
  requireSigner(signerOrProvider);

  return signerOrProvider.getAddress();
}

export function ipfsHashToBytes32(ipfsHash: string): string {
  // Convert IPFS hash to bytes32 by taking keccak256 hash
  // This is a common pattern for storing IPFS hashes in smart contracts
  return keccak256(toUtf8Bytes(ipfsHash));
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

export function formatSQT(amount: bigint): string {
  return `${formatEther(amount).slice(0, 10)} SQT`;
}
