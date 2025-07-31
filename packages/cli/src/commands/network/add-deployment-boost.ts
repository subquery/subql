// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {parseEther, formatEther} from '@ethersproject/units';
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

  // Check current allowance
  const allowance = await sdk.sqToken.allowance(userAddress, sdk.rewardsBooster.address);
  logger.info(`Current allowance: ${formatEther(allowance)} SQT`);
  logger.info(`Amount needed: ${formatEther(amount)} SQT`);

  if (allowance.lt(amount)) {
    const needed = amount.sub(allowance);
    logger.warn(`Insufficient allowance. Need to approve ${formatEther(needed)} SQT additional allowance.`);

    if (prompt) {
      const confirm = await prompt({
        type: 'boolean',
        message: `Approve additional ${formatEther(needed)} SQT allowance for rewards booster?`,
      });
      if (!confirm) {
        throw new Error('Allowance approval was cancelled. Cannot proceed with boost.');
      }
    } else {
      logger.info('Auto-approving allowance in non-interactive mode');
    }

    logger.info('Increasing allowance of SQT to boost project...');
    try {
      const allowanceTx = await sdk.sqToken.increaseAllowance(sdk.rewardsBooster.address, needed);
      console.log('allowance tx', allowanceTx);
      const allowanceReceipt = await checkTransactionSuccess(allowanceTx);
    } catch (e) {
      console.error('Error increasing allowance', e);
      throw e;
    }
    logger.info('✅ Successfully increased allowance of SQT to boost project');
  } else {
    logger.info('✅ Sufficient allowance already exists');
  }

  const deploymentIdBytes32 = ipfsHashToBytes32(args.deploymentId);
  const tx = await sdk.rewardsBooster.boostDeployment(deploymentIdBytes32, amount);

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

export default class AddDeploymentBoost extends Command {
  description = 'Increase the boost for a deployment';
  static flags = zodToFlags(addDeploymentBoostInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(AddDeploymentBoost);

    const result = await addDeploymentBoostAdapter(flags, commandLogger(this), makeCLIPrompt());

    this.log('Boosted deployment:', JSON.stringify(result, null, 2));
  }
}

export function registerAddDeploymentBoostMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    AddDeploymentBoost.name,
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
