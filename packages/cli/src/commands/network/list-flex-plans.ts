// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {STABLE_COIN_ADDRESSES, STABLE_COIN_DECIMAL, STABLE_COIN_SYMBOLS} from '@subql/network-config';
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
import {formatSQT, getSignerOrProvider, networkNameSchema, requireSigner} from '../../controller/network/constants';
import {jsonToTable} from '../../utils';
import {ConsumerHostClient} from '../../controller/network/consumer-host/client';

export const listFlexPlansInputs = z.object({
  network: networkNameSchema,
  address: z.string({description: 'The account address to list boosts for'}).optional(),
});
export type ListFlexPlansInputs = z.infer<typeof listFlexPlansInputs>;

export const listFlexPlansOutputs = listFlexPlansResponseSchema;

async function listFlexPlansAdapter(
  args: ListFlexPlansInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof listFlexPlansOutputs>> {
  const signerOrProvider = await getSignerOrProvider(args.network, logger, undefined, true);
  requireSigner(signerOrProvider);
  // logger.info(`Listing flex plans for address: ${address}`);

  const chsApi = await ConsumerHostClient.create(args.network, signerOrProvider, logger);

  const plans = await chsApi.listPlans();

  console.log('PLANS', plans);

  throw new Error('Not implemented yet');

  // const x = await chsApi.users.channelControllerIndex({});

  // const flexPlans = await listFlexPlans(args.network, address);

  // return flexPlans;
}

export default class ListFlexPlans extends Command {
  static description = 'Get a list of the deployments an account boosts';
  static flags = zodToFlags(listFlexPlansInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListFlexPlans);

    const logger = commandLogger(this);

    const res = await listFlexPlansAdapter(flags, logger, makeCLIPrompt());

    if (!res.plans.length) {
      this.log('No flex plans');
      return;
    }

    // this.log(
    //   jsonToTable(
    //     res.plans.map(
    //       ({
    //         deploymentId,
    //         deploymentMeta,
    //         id,
    //         planTemplateMetadata,
    //         price,
    //         priceToken,
    //         projectId,
    //         projectMeta,
    //         ...rest
    //       }) => {
    //         const subProjectMeta = projectMeta ? {projectName: projectMeta.name} : {};
    //         const subDeploymentMeta = deploymentMeta ? {deploymentVersion: deploymentMeta.version} : {};
    //         const {description, ...templateMeta} = planTemplateMetadata ?? {};

    //         const symbol =
    //           STABLE_COIN_ADDRESSES[flags.network] === priceToken ? STABLE_COIN_SYMBOLS[flags.network] : 'SQT';
    //         const decimals = STABLE_COIN_ADDRESSES[flags.network] === priceToken ? STABLE_COIN_DECIMAL : undefined;

    //         return {
    //           planId: id,
    //           ...rest,
    //           ...templateMeta,
    //           ...subProjectMeta,
    //           deploymentId,
    //           ...subDeploymentMeta,
    //           price: formatSQT(price, decimals, symbol),
    //         };
    //       }
    //     )
    //   )
    // );
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
