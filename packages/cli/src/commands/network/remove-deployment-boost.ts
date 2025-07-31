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
  ipfsHashToBytes32,
  networkNameSchema,
  requireSigner,
} from '../../controller/network/constants';

const removeDeploymentBoostInputs = z.object({
  network: networkNameSchema,
  deploymentId: z.string({description: 'The deployment id for the project'}),
  amount: z.string({description: 'The amount of boost to remove from the deployment, in SQT'}),
});
type BoostProjectInputs = z.infer<typeof removeDeploymentBoostInputs>;

const removeDeploymentBoostOutputs = z.object({
  transactionHash: z.string({description: 'The hash of the transaction that boosted the project'}),
  amount: z.bigint({description: 'Then new amount in SQT boosted by the account'}),
});

async function removeDeploymentBoostAdapter(
  args: BoostProjectInputs,
  logger: Logger,
  prompt?: Prompt
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

  const deploymentIdBytes32 = ipfsHashToBytes32(args.deploymentId);
  const tx = await sdk.rewardsBooster.removeBoosterDeployment(deploymentIdBytes32, amount);

  const receipt = await checkTransactionSuccess(tx);

  receipt.events?.forEach((event) => {
    const parsedEvent = sdk.rewardsBooster.interface.parseLog(event);

    const boostAddedEvent = sdk.rewardsBooster.interface.events['DeploymentBoosterAdded(bytes32,address,uint256)'];
    if (parsedEvent.name === boostAddedEvent.name) {
      // TODO check this is a new amount or total amount
      const amount = (parsedEvent as unknown as DeploymentBoosterAddedEvent).args.amount;
    }
  });

  // TODO get new total, from receipt events
  const totalAmount = 0n;

  return {
    transactionHash: tx.hash,
    amount: totalAmount,
  };
}

export default class RemoveDeploymentBoost extends Command {
  description = 'Decrease the boost for a deployment';
  static flags = zodToFlags(removeDeploymentBoostInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(RemoveDeploymentBoost);

    const result = await removeDeploymentBoostAdapter(flags, commandLogger(this), makeCLIPrompt());

    this.log('Boosted deployment:', JSON.stringify(result, null, 2));

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerRemoveDeploymentBoostMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    RemoveDeploymentBoost.name,
    {
      description: RemoveDeploymentBoost.description,
      inputSchema: removeDeploymentBoostInputs.shape,
      outputSchema: getMCPStructuredResponse(removeDeploymentBoostOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : undefined;
      return removeDeploymentBoostAdapter(args, logger, prompt);
    })
  );
}
