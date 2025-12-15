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
  makeMCPElicitPrmompt,
  mcpLogger,
  MCPToolOptions,
  Prompt,
  withStructuredResponse,
  zodToFlags,
} from '../../adapters/utils';
import {
  checkTransactionSuccess,
  getContractSDK,
  getSignerOrProvider,
  cidToBytes32,
  networkNameSchema,
  requireSigner,
  formatSQT,
} from '../../controller/network/constants';
import {parseContractError} from '../../controller/network/contract-errors';
import {checkAndIncreaseAllowance} from '../../controller/network/utils';

const addDeploymentBoostInputs = z.object({
  network: networkNameSchema,
  deploymentId: z.string({description: 'The deployment id for the project'}),
  amount: z.string({description: 'The amount to boost the deployment with, in SQT'}),
});
type BoostProjectInputs = z.infer<typeof addDeploymentBoostInputs>;

const addDeploymentBoostOutputs = z.object({
  transactionHash: z.string({description: 'The hash of the transaction that boosted the project'}),
  amount: z.bigint({description: 'Then new amount in SQT boosted by the account'}),
});

async function addDeploymentBoostAdapter(
  args: BoostProjectInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof addDeploymentBoostOutputs>> {
  const amount = parseEther(args.amount);
  if (amount.lte(0n)) {
    throw new Error('Amount must be greater than 0');
  }

  const signer = await getSignerOrProvider(args.network, logger, undefined);
  const sdk = getContractSDK(signer, args.network);
  requireSigner(signer);

  const userAddress = await signer.getAddress();
  logger.info(`Using address: ${userAddress}`);

  await checkAndIncreaseAllowance(signer, sdk, amount, sdk.rewardsBooster.address, logger, 'boost project', prompt);

  const deploymentIdBytes32 = cidToBytes32(args.deploymentId);

  const tx = await sdk.rewardsBooster.boostDeployment(deploymentIdBytes32, amount).catch(
    parseContractError({
      RB015: async () =>
        `Deployment boost is too small. The total deployment boost needs to be at least ${formatSQT(await sdk.rewardsBooster.minimumDeploymentBooster())}`,
    })
  );

  await checkTransactionSuccess(tx);

  return {
    transactionHash: tx.hash,
    amount: amount.toBigInt(),
  };
}

export default class AddDeploymentBoost extends Command {
  static description = 'Increase the boost for a deployment';
  static flags = zodToFlags(addDeploymentBoostInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(AddDeploymentBoost);

    const result = await addDeploymentBoostAdapter(flags, commandLogger(this), makeCLIPrompt());

    this.log(
      `Boosted deployment: ${flags.deploymentId} by ${formatSQT(result.amount)}. TransactionHash: ${result.transactionHash}`
    );

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerAddDeploymentBoostMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    `network.${AddDeploymentBoost.name}`,
    {
      description: AddDeploymentBoost.description,
      inputSchema: addDeploymentBoostInputs.shape,
      outputSchema: getMCPStructuredResponse(addDeploymentBoostOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : undefined;
      return addDeploymentBoostAdapter(args, logger, prompt);
    })
  );
}
