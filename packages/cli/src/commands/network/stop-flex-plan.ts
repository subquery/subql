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
import {networkNameSchema, getSignerOrProvider, requireSigner} from '../../controller/network/constants';
import {ConsumerHostClient} from '../../controller/network/consumer-host/client';

const stopFlexPlanInputs = z.object({
  network: networkNameSchema,
  deploymentId: z.string({description: 'The deploymentId to create a flex plan for'}),
});
type CreateApiKeyInputs = z.infer<typeof stopFlexPlanInputs>;

const stopFlexPlanOutputs = z.object({});

export async function stopFlexPlanAdapter(
  args: CreateApiKeyInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof stopFlexPlanOutputs>> {
  const signer = await getSignerOrProvider(args.network, logger, undefined, false);
  requireSigner(signer);

  const chs = await ConsumerHostClient.create(args.network, signer, logger);

  const plans = await chs.listPlans();
  console.log('AAAAA');
  const existingPlan = plans.find((p) => p.deployment.deployment === args.deploymentId);
  console.log('BBBBBB', existingPlan);
  if (!existingPlan) {
    throw new Error('No existing flex plan for this deployment');
  }

  console.log('CCCCCC');

  const plan = await chs.updatePlan(existingPlan.id, '0', 0).catch((e) => {
    console.error(e);
    throw e;
  });

  console.log('UPDATED PLAN', plan);

  return {};
}

export default class StopNetworkFlexPlan extends Command {
  static description = 'Stop a Flex Plan for a deployment on the SubQuery Network';
  static flags = zodToFlags(stopFlexPlanInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(StopNetworkFlexPlan);
    const logger = commandLogger(this);

    const result = await stopFlexPlanAdapter({...flags}, logger, makeCLIPrompt());

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerStopNetworkFlexPlanMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    StopNetworkFlexPlan.name,
    {
      description: StopNetworkFlexPlan.description,
      inputSchema: stopFlexPlanInputs.shape,
      outputSchema: getMCPStructuredResponse(stopFlexPlanOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const prompt = /*opts.supportsElicitation ? makeMCPElicitPrmompt(server) : */ undefined;
      return stopFlexPlanAdapter(args, logger, prompt);
    })
  );
}
