// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {parseEther} from '@ethersproject/units';
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
import {
  networkNameSchema,
  getSignerOrProvider,
  requireSigner,
  getContractSDK,
  checkTransactionSuccess,
  formatSQT,
} from '../../controller/network/constants';
import {ConsumerHostClient} from '../../controller/network/consumer-host/client';
import {hostingPlanSchema} from '../../controller/network/consumer-host/schemas';
import {listDeploymentBoosts} from '../../controller/network/list-deployment-boosts';
import {checkAndIncreaseAllowance} from '../../controller/network/utils';

const createFlexPlanInputs = z.object({
  network: networkNameSchema,
  deploymentId: z.string({description: 'The deploymentId to create a flex plan for'}),
  amount: z.string({description: 'The amount to deposit into the plan, in SQT'}),
});
type CreateApiKeyInputs = z.infer<typeof createFlexPlanInputs>;

const createFlexPlanOutputs = z.object({
  plan: hostingPlanSchema,
  apiKey: z.string({description: 'An api key if one is created'}).optional(),
});

export async function createFlexPlanAdapter(
  args: CreateApiKeyInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof createFlexPlanOutputs>> {
  const amount = parseEther(args.amount);
  if (amount.lte(0n)) {
    throw new Error('Amount must be greater than 0');
  }

  const signer = await getSignerOrProvider(args.network, logger, undefined, false);
  const sdk = getContractSDK(signer, args.network);
  requireSigner(signer);

  const address = await signer.getAddress();
  const chs = await ConsumerHostClient.create(args.network, signer, logger);

  const boosts = await listDeploymentBoosts(args.network, args.deploymentId);
  const hasBoosted = boosts.boosts.some((b) => b.consumer.toLowerCase() === address.toLowerCase());

  if (!hasBoosted) {
    logger.info('Deployment is not boosted, deposit is required');
    await checkAndIncreaseAllowance(
      signer,
      sdk,
      amount,
      sdk.consumerHost.address,
      logger,
      'create a flex plan',
      prompt
    );

    try {
      logger.info(`Depositing ${formatSQT(amount)} to create flex plan`);
      const depositTx = await sdk.consumerHost.deposit(amount, true);
      await checkTransactionSuccess(depositTx);
    } catch (e) {
      throw new Error('Failed to deposit SQT for flex plan', {cause: e});
    }
  }

  let apiKey: string | undefined;
  const existingApiKeys = await chs.getAPIKeys();
  if (!existingApiKeys.length) {
    logger.info(`Creating an API key`);
    const newKey = await chs.newAPIKey('QueryEndpoint');
    apiKey = newKey.apiKey;
  }

  const plan = await chs.createPlan(args.deploymentId, amount.toBigInt());

  return {
    apiKey,
    plan,
  };
}

export default class CreateNetworkFlexPlan extends Command {
  static description = 'Create a new Flex Plan for querying a SubQuery deployment on the SubQuery Network';
  static flags = zodToFlags(createFlexPlanInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(CreateNetworkFlexPlan);
    const logger = commandLogger(this);

    const result = await createFlexPlanAdapter({...flags}, logger, makeCLIPrompt());

    this.log(`API Key: ${result.apiKey}`);
    this.log(`Plan details: ${JSON.stringify(result.plan, null, 2)}`);

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerCreateNetworkFlexPlanMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `network.${CreateNetworkFlexPlan.name}`,
    {
      description: CreateNetworkFlexPlan.description,
      inputSchema: createFlexPlanInputs.shape,
      outputSchema: getMCPStructuredResponse(createFlexPlanOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const prompt = /*opts.supportsElicitation ? makeMCPElicitPrmompt(server) : */ undefined;
      return createFlexPlanAdapter(args, logger, prompt);
    })
  );
}
