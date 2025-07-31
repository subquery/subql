// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IPFS_NODE_ENDPOINT, IPFSHTTPClientLite} from '@subql/common';
import {SQNetworks} from '@subql/network-config';
import {z} from 'zod';
import {resultToBuffer} from '../../utils';
import {GetDeploymentIndexersQuery, GetDeploymentIndexersQueryVariables} from './__graphql__/base-types';
import {GetDeploymentIndexers} from './__graphql__/network/deployments.generated';
import {getQueryClient} from './constants';

const indexerDeploymentMetadata = z.object({
  chainId: z.string(),
  controller: z.string(),
  dbSize: z.number(),
  deploymentId: z.string(),
  genesis: z.string(),
  indexer: z.string(),
  lastHeight: z.number(),
  lastTime: z.number(),
  rateLimit: z.number(),
  signature: z.string(),
  startHeight: z.number().optional(),
  subqueryHealthy: z.boolean(),
  subqueryNode: z.string({description: 'The subquery node version'}),
  subqueryQuery: z.string({description: 'The query service version'}),
  targetHeight: z.number(),
  timestamp: z.number(),
});
export type IndexerDeploymentMetadata = z.infer<typeof indexerDeploymentMetadata>;

export const deploymentIndexer = z.object({
  indexerId: z.string(),
  indexerMetadata: z.string(),
  indexerMeta: z
    .object({
      name: z.string(),
      url: z.string(),
      description: z.string().optional(),
    })
    .optional(),
  status: z.string(),
  indexerDeploymentMeta: indexerDeploymentMetadata.optional(),
});
export type DeploymentIndexer = z.infer<typeof deploymentIndexer>;

async function getIndexerDeploymentMetadata(url: string, deploymentId: string): Promise<IndexerDeploymentMetadata> {
  const res = await fetch(`${url}/metadata/${deploymentId}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch indexer metadata: ${res.statusText}`);
  }
  return res.json();
}

export async function listDeploymentIndexers(
  network: SQNetworks,
  deploymentId: string,
  ipfsEndpoint = IPFS_NODE_ENDPOINT
): Promise<DeploymentIndexer[]> {
  const res = await getQueryClient(network).query<GetDeploymentIndexersQuery, GetDeploymentIndexersQueryVariables>({
    query: GetDeploymentIndexers,
    variables: {deploymentId},
  });

  if (res.errors) {
    throw new Error(`Failed to fetch indexers for deployment ${deploymentId}`);
  }

  if (!res.data?.deployment) {
    throw new Error(`Project with ID ${deploymentId} not found`);
  }

  const ipfs = new IPFSHTTPClientLite({url: ipfsEndpoint});

  const raw = res.data?.deployment?.indexers?.nodes ?? [];
  const indexers = await Promise.all(
    raw.map(async (d) => {
      if (!d) return null;
      const {__typename, indexer, ...rest} = d;

      // Should never happen
      if (!indexer) {
        return null;
      }

      const indexerMeta: DeploymentIndexer['indexerMeta'] = await resultToBuffer(ipfs.cat(indexer.metadata))
        .then((data) => JSON.parse(data))
        .catch((e) => undefined); // Swallow the error;

      const indexerDeploymentMeta = indexerMeta
        ? await getIndexerDeploymentMetadata(indexerMeta.url, deploymentId).catch((e) => undefined)
        : undefined;

      return <DeploymentIndexer>{
        ...rest,
        indexerMetadata: indexer.metadata,
        indexerMeta,
        indexerDeploymentMeta,
      };
    })
  );

  return indexers.filter((d): d is DeploymentIndexer => d !== null);
}
