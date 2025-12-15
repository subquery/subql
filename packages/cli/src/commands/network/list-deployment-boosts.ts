// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {getMCPStructuredResponse, withStructuredResponse, zodToFlags} from '../../adapters/utils';
import {formatSQT, networkNameSchema} from '../../controller/network/constants';
import {
  listDeploymentBoosts,
  responseSchema as listBoostsResponseSchema,
} from '../../controller/network/list-deployment-boosts';
import {jsonToTable} from '../../utils';

export const listBoostsInputs = z.object({
  network: networkNameSchema,
  deploymentId: z.string({description: 'The deployment id for the project'}),
});
export type ListBoostsInputs = z.infer<typeof listBoostsInputs>;

export const listBoostsOutputs = listBoostsResponseSchema;

async function listBoostsAdapter(args: ListBoostsInputs): Promise<z.infer<typeof listBoostsOutputs>> {
  const boosts = await listDeploymentBoosts(args.network, args.deploymentId);

  return boosts;
}

export default class ListDeploymentBoosts extends Command {
  static description = 'Get a list of boosts made to a project deployment';
  static flags = zodToFlags(listBoostsInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListDeploymentBoosts);

    const res = await listBoostsAdapter(flags);

    if (!res.boosts.length) {
      this.log('This deployment has no boosts');
      return;
    }

    this.log(`Total boost: ${formatSQT(res.totalBoost)}`);
    this.log(
      jsonToTable(
        res.boosts.map((b) => {
          return {
            ...b,
            totalAmount: formatSQT(b.totalAmount),
            rewards: formatSQT(b.rewards),
          };
        })
      )
    );
  }
}

export function registerListDeploymentBoostsMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `network.${ListDeploymentBoosts.name}`,
    {
      description: ListDeploymentBoosts.description,
      inputSchema: listBoostsInputs.shape,
      outputSchema: getMCPStructuredResponse(listBoostsOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      return listBoostsAdapter(args);
    })
  );
}
