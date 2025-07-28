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
import {deploymentSchema, listDeployments} from '../../controller/network/list-deployments';

const listDeploymentsInputs = z.object({
  network: networkNameSchema,
  projectId: z.string({description: 'The ID of the project to list deployments for'}),
});
type ListDeploymentsInputs = z.infer<typeof listDeploymentsInputs>;

const listDeploymentsOutputs = z.object({
  deployments: z.array(deploymentSchema),
});

async function listDeploymentsAdapter(
  args: ListDeploymentsInputs,
  logger: Logger
): Promise<z.infer<typeof listDeploymentsOutputs>> {
  const deployments = await listDeployments(args.network, args.projectId);

  return {deployments};
}

export default class ListNetworkDeployments extends Command {
  static description = 'List deployments for a SubQuery project on a specific network';
  static flags = zodToFlags(listDeploymentsInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListNetworkDeployments);

    const result = await listDeploymentsAdapter(flags, commandLogger(this));

    this.log('Deployments:', JSON.stringify(result.deployments, null, 2));
  }
}

export function registerListNetworkDeploymentsMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    ListNetworkDeployments.name,
    {
      description: ListNetworkDeployments.description,
      inputSchema: listDeploymentsInputs.shape,
      outputSchema: getMCPStructuredResponse(listDeploymentsOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);

      return listDeploymentsAdapter(args, logger);
    })
  );
}
