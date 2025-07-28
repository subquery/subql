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
import {checkTransactionSuccess, getContractSDK, networkNameSchema} from '../../controller/network/constants';

const boostDeploymentInputs = z.object({
  network: networkNameSchema,
  deploymentId: z.string({description: 'The deployment id for the project'}),
  amount: z.string({description: 'The amount to boost the project with, in SQT'}),
});
type BoostProjectInputs = z.infer<typeof boostDeploymentInputs>;

const boostDeploymentOutputs = z.object({
  transactionHash: z.string({description: 'The hash of the transaction that boosted the project'}),
  amount: z.bigint({description: 'Then new amount in SQT boosted by the account'}),
});

async function boostDeploymentAdapter(
  args: BoostProjectInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof boostDeploymentOutputs>> {
  const sdk = getContractSDK(args.network);

  const amount = parseEther(args.amount);
  if (amount.lte(0n)) {
    throw new Error('Amount must be greater than 0');
  }

  // TODO check allowance and increase if needed
  const allowance = await sdk.sqToken.allowance('TODO', sdk.rewardsBooster.address);
  if (allowance.lte(amount)) {
    if (prompt) {
      const confirm = await prompt({
        type: 'boolean',
        message: `Approve reward booster allowance?`,
      });
      if (!confirm) {
        throw new Error('Allowance must be increased before boosting deployment');
      }
    } else {
      // TODO could throw an error here
    }

    // TODO this could be reduced to amount - allowance
    logger.info('Increasing allowance of SQT to boost project');
    const allowanceTx = await sdk.sqToken.increaseAllowance(sdk.rewardsBooster.address, amount);
    const allowanceRecepit = await checkTransactionSuccess(allowanceTx);
    logger.info('Increased allowance of SQT to boost project');
  }

  const tx = await sdk.rewardsBooster.boostDeployment(args.deploymentId, amount);

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

export default class BoostDeployment extends Command {
  description = 'Increase the boost for a deployment';
  static flags = zodToFlags(boostDeploymentInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(BoostDeployment);

    const result = await boostDeploymentAdapter(flags, commandLogger(this), makeCLIPrompt());

    this.log('Boosted deployment:', JSON.stringify(result, null, 2));
  }
}

export function registerBoostDeploymentMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    BoostDeployment.name,
    {
      description: BoostDeployment.description,
      inputSchema: boostDeploymentInputs.shape,
      outputSchema: getMCPStructuredResponse(boostDeploymentOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : undefined;
      return boostDeploymentAdapter(args, logger, prompt);
    })
  );
}
