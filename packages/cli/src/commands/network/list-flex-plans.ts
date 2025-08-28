// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
import {ConsumerHostClient} from '../../controller/network/consumer-host/client';
import {formatSQT, getSignerOrProvider, networkNameSchema, requireSigner} from '../../controller/network/constants';
import {jsonToTable} from '../../utils';
import {listFlexPlans, metaHostingPlanSchema} from '../../controller/network/list-flex-plans';

export const listFlexPlansInputs = z.object({
  network: networkNameSchema,
  address: z.string({description: 'The account address to list boosts for'}).optional(),
});
export type ListFlexPlansInputs = z.infer<typeof listFlexPlansInputs>;

export const listFlexPlansOutputs = z.array(metaHostingPlanSchema);

async function listFlexPlansAdapter(
  args: ListFlexPlansInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof listFlexPlansOutputs>> {
  const signerOrProvider = await getSignerOrProvider(args.network, logger, undefined, true);
  requireSigner(signerOrProvider);
  // logger.info(`Listing flex plans for address: ${address}`);

  const chsApi = await ConsumerHostClient.create(args.network, signerOrProvider, logger);

  const plans = await listFlexPlans(chsApi);

  return plans;
}

export default class ListFlexPlans extends Command {
  static description = 'Get a of your flex plans';
  static flags = zodToFlags(listFlexPlansInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListFlexPlans);

    const logger = commandLogger(this);

    const res = await listFlexPlansAdapter(flags, logger, makeCLIPrompt());

    if (!res.length) {
      this.log('No flex plans');
    } else {
      this.log(
        jsonToTable(
          res.map((plan) => {
            return {
              id: plan.id,
              project: plan.projectMetadata?.name ?? plan.project.id,
              deployment: plan.deployment.deployment,
              price: formatSQT(plan.price),
              maximum: plan.maximum,
              spent: formatSQT(plan.spent),
              isActivated: plan.isActivated,
              createdAt: new Date(plan.createdAt).toLocaleString(),
              updatedAt: new Date(plan.updatedAt).toLocaleString(),
            };
          })
        )
      );
    }

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerListFlexPlansMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    ListFlexPlans.name,
    {
      description: ListFlexPlans.description,
      inputSchema: listFlexPlansInputs.shape,
      outputSchema: getMCPStructuredResponse(listFlexPlansOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      // const prompt =
      return listFlexPlansAdapter(args, logger);
    })
  );
}
