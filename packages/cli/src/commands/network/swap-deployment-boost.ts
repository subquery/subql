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

const swapDeploymentBoostInputs = z.object({
  network: networkNameSchema,
  fromDeploymentId: z.string({description: 'The deployment id for the project that is already boosted'}),
  toDeploymentId: z.string({description: 'The deployment id for the project to move the boost to'}),
  amount: z.string({description: 'The amount to boost the deployment with, in SQT'}),
});
type BoostProjectInputs = z.infer<typeof swapDeploymentBoostInputs>;

const swapDeploymentBoostOutputs = z.object({
  transactionHash: z.string({description: 'The hash of the transaction that boosted the project'}),
  amount: z.bigint({description: 'Then new amount in SQT boosted by the account'}),
});

async function swapDeploymentBoostAdapter(
  args: BoostProjectInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof swapDeploymentBoostOutputs>> {
  const amount = parseEther(args.amount);
  if (amount.lte(0n)) {
    throw new Error('Amount must be greater than 0');
  }

  if (args.fromDeploymentId === args.toDeploymentId) {
    throw new Error('Cannot swap boost to the same deployment');
  }

  const signer = await getSignerOrProvider(args.network, logger, undefined);
  const sdk = getContractSDK(signer, args.network);
  requireSigner(signer);

  const userAddress = await signer.getAddress();
  logger.info(`Using address: ${userAddress}`);

  await checkAndIncreaseAllowance(signer, sdk, amount, sdk.rewardsBooster.address, logger, 'boost project', prompt);

  const deploymentFromBytes32 = cidToBytes32(args.fromDeploymentId);
  const deploymentToBytes32 = cidToBytes32(args.toDeploymentId);
  const tx = await sdk.rewardsBooster
    .swapBoosterDeployment(userAddress, deploymentFromBytes32, deploymentToBytes32, amount)
    .catch(parseContractError({}));

  await checkTransactionSuccess(tx);

  return {
    transactionHash: tx.hash,
    amount: amount.toBigInt(),
  };
}

export default class SwapDeploymentBoost extends Command {
  static description = 'Swap the boost from one deployment to another deployment on the SubQuery Network';
  static flags = zodToFlags(swapDeploymentBoostInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(SwapDeploymentBoost);

    const result = await swapDeploymentBoostAdapter(flags, commandLogger(this), makeCLIPrompt());

    this.log(
      `Swapped boost (${formatSQT(result.amount)}) from deployment: ${flags.fromDeploymentId} to deployment ${
        flags.toDeploymentId
      }. TransactionHash: ${result.transactionHash}`
    );
  }
}

export function registerSwapDeploymentBoostMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    `network.${SwapDeploymentBoost.name}`,
    {
      description: SwapDeploymentBoost.description,
      inputSchema: swapDeploymentBoostInputs.shape,
      outputSchema: getMCPStructuredResponse(swapDeploymentBoostOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : undefined;
      return swapDeploymentBoostAdapter(args, logger, prompt);
    })
  );
}
