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
import {formatSQT, networkNameSchema, resolveAddress} from '../../controller/network/constants';
import {
  listAccountBoosts,
  responseSchema as listBoostsResponseSchema,
} from '../../controller/network/list-account-boosts';
import {jsonToTable} from '../../utils';

export const listBoostsInputs = z.object({
  network: networkNameSchema,
  address: z.string({description: 'The account address to list boosts for'}).optional(),
});
export type ListBoostsInputs = z.infer<typeof listBoostsInputs>;

export const listBoostsOutputs = listBoostsResponseSchema;

async function listBoostsAdapter(args: ListBoostsInputs, logger: Logger): Promise<z.infer<typeof listBoostsOutputs>> {
  const address = await resolveAddress(args.network, logger, undefined, args.address);
  logger.info(`Listing boosts for address: ${address}`);
  const boosts = await listAccountBoosts(args.network, address);

  return boosts;
}

export default class ListAccountBoosts extends Command {
  static description = 'Get a list of the deployments an account boosts';
  static flags = zodToFlags(listBoostsInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListAccountBoosts);

    const logger = commandLogger(this);

    const res = await listBoostsAdapter(flags, logger);

    if (!res.boosts.length) {
      this.log(`This account doesn't boost any projects`);
    } else {
      this.log(`Total boost: ${formatSQT(res.totalBoost)}`);
      this.log(
        jsonToTable(
          res.boosts.map(({deploymentId, deploymentMeta, projectId, projectMeta, totalAmount}) => {
            const subProjectMeta = projectMeta ? {name: projectMeta.name} : {};
            const subDeploymentMeta = deploymentMeta ? {deploymentVersion: deploymentMeta.version} : {};
            return {
              projectId,
              ...subProjectMeta,
              deploymentId,
              ...subDeploymentMeta,
              amount: formatSQT(totalAmount),
            };
          })
        )
      );
    }

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerListAccountBoostsMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `network.${ListAccountBoosts.name}`,
    {
      description: ListAccountBoosts.description,
      inputSchema: listBoostsInputs.shape,
      outputSchema: getMCPStructuredResponse(listBoostsOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      return listBoostsAdapter(args, logger);
    })
  );
}
