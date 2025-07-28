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
import {listProjects, projectSchema} from '../../controller/network/list-projects';

const listProjectsInputs = z.object({
  address: z.string({description: 'The address of the account that owns the projects'}),
  network: networkNameSchema,
  networkRpc: z.string({description: 'Override the network rpc url'}).optional(),
});
type ListProjectsInputs = z.infer<typeof listProjectsInputs>;

const listProjectOutputs = z.object({
  projects: z.array(projectSchema),
});

async function listProjectsAdapter(
  args: ListProjectsInputs,
  logger: Logger
): Promise<z.infer<typeof listProjectOutputs>> {
  logger.info(`Listing projects for address: ${args.address}`);

  const projects = await listProjects(args.network, args.address);

  return {
    projects,
  };
}

export default class ListProjects extends Command {
  static description = 'List projects for a given account on then SubQuery network';
  static flags = zodToFlags(listProjectsInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListProjects);

    const res = await listProjectsAdapter(flags, commandLogger(this));

    this.log(`Projects for account ${flags.address}:`, res);
  }
}

export function registerListNetworkProjectsMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    ListProjects.name,
    {
      description: ListProjects.description,
      inputSchema: listProjectsInputs.shape,
      outputSchema: getMCPStructuredResponse(listProjectOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      return listProjectsAdapter(args, logger);
    })
  );
}
