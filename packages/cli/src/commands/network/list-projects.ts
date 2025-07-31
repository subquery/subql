// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {ProjectType} from '@subql/contract-sdk';
import {z} from 'zod';
import {
  commandLogger,
  getMCPStructuredResponse,
  Logger,
  mcpLogger,
  withStructuredResponse,
  zodToFlags,
} from '../../adapters/utils';
import {formatSQT, networkNameSchema, resolveAddress} from '../../controller/network/constants';
import {listProjects, projectSchema} from '../../controller/network/list-projects';
import {jsonToTable} from '../../utils';

const listProjectsInputs = z.object({
  address: z.string({description: 'The address of the account that owns the projects'}).optional(),
  network: networkNameSchema,
  networkRpc: z.string({description: 'Override the network rpc url'}).optional(),
});
type ListProjectsInputs = z.infer<typeof listProjectsInputs>;

const listProjectOutputs = z.object({
  address: z.string({description: 'The account the projects belong to'}),
  projects: z.array(projectSchema),
});

async function listProjectsAdapter(
  args: ListProjectsInputs,
  logger: Logger
): Promise<z.infer<typeof listProjectOutputs>> {
  const address = await resolveAddress(args.network, logger, args.networkRpc, args.address);
  logger.info(`Listing projects for address: ${address}`);

  const projects = await listProjects(args.network, address);

  return {
    address,
    projects,
  };
}

export default class ListProjects extends Command {
  static description = 'List projects for a given account on then SubQuery network';
  static flags = zodToFlags(listProjectsInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListProjects);

    const res = await listProjectsAdapter(flags, commandLogger(this));

    this.log(`Projects for account ${res.address}:`);
    this.log(
      jsonToTable(
        res.projects.map(({id, meta, metadata, owner, ...p}) => {
          const subMeta = meta ? {name: meta.name} : {metadata};
          return {
            id,
            ...subMeta,
            ...p,
            totalAllocation: formatSQT(p.totalAllocation),
            totalBoost: formatSQT(p.totalBoost),
            totalReward: formatSQT(p.totalReward),
            type: ProjectType[p.type],
          };
        })
      )
    );

    // Exit with success, walletconnect will keep things running
    this.exit(0);
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
