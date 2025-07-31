// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {
  commandLogger,
  getMCPStructuredResponse,
  Logger,
  mcpLogger,
  withStructuredResponse,
  zodToFlags,
} from '../../adapters/utils';
import {networkNameSchema} from '../../controller/network/constants';
import {
  listDeploymentIndexers,
  deploymentIndexer,
  IndexerDeploymentMetadata,
} from '../../controller/network/list-deployment-indexers';
import {jsonToTable} from '../../utils';

const listIndexersInputs = z.object({
  network: networkNameSchema,
  deploymentId: z.string({description: 'The DeploymentID of the project to list deployments for'}),
});
type ListIndexersInputs = z.infer<typeof listIndexersInputs>;

const listIndexersOutputs = z.object({
  indexers: z.array(deploymentIndexer),
});

async function listIndexersAdapter(
  args: ListIndexersInputs,
  logger: Logger
): Promise<z.infer<typeof listIndexersOutputs>> {
  const indexers = await listDeploymentIndexers(args.network, args.deploymentId);

  return {indexers};
}

export default class ListDeploymentIndexers extends Command {
  static description = 'List deployments for a SubQuery project on a specific network';
  static flags = zodToFlags(listIndexersInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListDeploymentIndexers);

    const result = await listIndexersAdapter(flags, commandLogger(this));

    const getProgress = (indexerDeploymentMeta?: IndexerDeploymentMetadata): string => {
      if (!indexerDeploymentMeta) return 'Unknown';
      const blocksBehind = Math.max(indexerDeploymentMeta.targetHeight - indexerDeploymentMeta.lastHeight, 0);
      const progress = ((indexerDeploymentMeta.lastHeight / indexerDeploymentMeta.targetHeight) * 100).toFixed(2);

      return `${progress}% (${blocksBehind > 0 ? `${blocksBehind} Block${blocksBehind > 1 ? 's' : ''} behind` : 'Fully synced'})`;
    };

    this.log(
      jsonToTable(
        result.indexers.map(({indexerDeploymentMeta, indexerMeta, indexerMetadata, ...rest}) => {
          const subMeta = indexerMeta ? {name: indexerMeta.name} : {indexerMetadata};

          return {
            ...subMeta,
            ...rest,
            progress: getProgress(indexerDeploymentMeta),
            healthy: indexerDeploymentMeta ? (indexerDeploymentMeta.subqueryHealthy ? 'Yes' : 'No') : 'Unknown',
          };
        })
      )
    );
  }
}

export function registerListDeploymentIndexersMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    ListDeploymentIndexers.name,
    {
      description: ListDeploymentIndexers.description,
      inputSchema: listIndexersInputs.shape,
      outputSchema: getMCPStructuredResponse(listIndexersOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);

      return listIndexersAdapter(args, logger);
    })
  );
}
