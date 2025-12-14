// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {parseEther} from '@ethersproject/units';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {DeploymentBoosterAddedEvent} from '@subql/contract-sdk/typechain/contracts/RewardsBooster';
import {z} from 'zod';
import {
  commandLogger,
  getMCPStructuredResponse,
  Logger,
  mcpLogger,
  MCPToolOptions,
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

const removeDeploymentBoostInputs = z.object({
  network: networkNameSchema,
  deploymentId: z.string({description: 'The deployment id for the project'}),
  amount: z.string({description: 'The amount of boost to remove from the deployment, in SQT'}),
});
type BoostProjectInputs = z.infer<typeof removeDeploymentBoostInputs>;

const removeDeploymentBoostOutputs = z.object({
  transactionHash: z.string({description: 'The hash of the transaction that boosted the project'}),
});

async function removeDeploymentBoostAdapter(
  args: BoostProjectInputs,
  logger: Logger
): Promise<z.infer<typeof removeDeploymentBoostOutputs>> {
  const amount = parseEther(args.amount);
  if (amount.lte(0n)) {
    throw new Error('Amount must be greater than 0');
  }
  const signerOrProvider = await getSignerOrProvider(args.network, logger);
  const sdk = getContractSDK(signerOrProvider, args.network);
  requireSigner(signerOrProvider);

  const userAddress = await signerOrProvider.getAddress();
  logger.info(`Using address: ${userAddress}`);

  const deploymentIdBytes32 = cidToBytes32(args.deploymentId);
  const tx = await sdk.rewardsBooster.removeBoosterDeployment(deploymentIdBytes32, amount).catch(
    parseContractError({
      RB016: async () =>
        `Deployment boost will be too small. The total deployment boost needs to be at least ${formatSQT(await sdk.rewardsBooster.minimumDeploymentBooster())}. Either remove less boost, or remove all the boost.`,
    })
  );

  const receipt = await checkTransactionSuccess(tx);

  return {
    transactionHash: tx.hash,
  };
}

export default class RemoveDeploymentBoost extends Command {
  static description = 'Decrease the boost amount for a project deployment on the SubQuery network';
  static flags = zodToFlags(removeDeploymentBoostInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(RemoveDeploymentBoost);

    const result = await removeDeploymentBoostAdapter(flags, commandLogger(this));

    this.log('Boosted deployment:', JSON.stringify(result, null, 2));

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerRemoveDeploymentBoostMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    `network.${RemoveDeploymentBoost.name}`,
    {
      description: RemoveDeploymentBoost.description,
      inputSchema: removeDeploymentBoostInputs.shape,
      outputSchema: getMCPStructuredResponse(removeDeploymentBoostOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      return removeDeploymentBoostAdapter(args, logger);
    })
  );
}
