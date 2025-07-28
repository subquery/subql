// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {formatEther} from '@ethersproject/units';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {
  commandLogger,
  getMCPStructuredResponse,
  Logger,
  makeCLIPrompt,
  mcpLogger,
  Prompt,
  withStructuredResponse,
  zodToFlags,
} from '../../adapters/utils';
import {listBoosts, responseSchema as listBoostsResponseSchema} from '../../controller/network/list-boosts';
import {networkNameSchema} from '../../controller/network/constants';

export const listBoostsInputs = z.object({
  network: networkNameSchema,
  deploymentId: z.string({description: 'The deployment id for the project'}),
  account: z.string({description: 'The account to list boosts for'}).optional(),
});
export type ListBoostsInputs = z.infer<typeof listBoostsInputs>;

export const listBoostsOutputs = listBoostsResponseSchema;

async function listBoostsAdapter(
  args: ListBoostsInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof listBoostsOutputs>> {
  const boosts = await listBoosts(args.network, args.deploymentId);

  return boosts;
}

export default class ListBoosts extends Command {
  static description = 'Get a list of the boosts for a deployment';
  static flags = zodToFlags(listBoostsInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListBoosts);

    const logger = commandLogger(this);

    const res = await listBoostsAdapter(flags, logger, makeCLIPrompt());

    this.log(`Total boost: ${formatEther(res.totalBoost)} SQT`);
    for (const boost of res.boosts) [this.log(`\t- ${boost.consumer}: ${formatEther(boost.totalAmount)} SQT`)];
  }
}

export function registerListBoostsMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    ListBoosts.name,
    {
      description: ListBoosts.description,
      inputSchema: listBoostsInputs.shape,
      outputSchema: getMCPStructuredResponse(listBoostsOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      // const prompt =
      return listBoostsAdapter(args, logger);
    })
  );
}
