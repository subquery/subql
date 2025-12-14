// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {
  commandLogger,
  getMCPStructuredResponse,
  Logger,
  mcpLogger,
  withStructuredResponse,
  zodToFlags,
} from '../../adapters/utils';
import {ROOT_API_URL_PROD} from '../../constants';
import {promoteDeployment} from '../../controller/deploy-controller';
import {checkToken} from '../../utils';

const promoteInputs = z.object({
  org: z.string({description: 'Github organization name'}),
  projectName: z.string({description: 'Project name'}),
  deploymentID: z.number({description: 'Deployment ID'}),
});
type PromoteInputs = z.infer<typeof promoteInputs>;

const promoteOutputs = z.object({
  deploymentID: z.number({description: 'Deployment ID of the promoted deployment'}),
});

export async function promoteAdapter(args: PromoteInputs, logger: Logger): Promise<z.infer<typeof promoteOutputs>> {
  const {deploymentID, org, projectName} = args;
  const authToken = await checkToken();
  await promoteDeployment(org, projectName, authToken, deploymentID, ROOT_API_URL_PROD);

  return {
    deploymentID,
  };
}

export default class PromoteDeployment extends Command {
  static description = 'Promote a deployment on the OnFinality managed services from a Stage environment to Production';
  static flags = zodToFlags(promoteInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(PromoteDeployment);

    const {deploymentID} = await promoteAdapter(flags, commandLogger(this));

    this.log(`Promoted deployment ${deploymentID} from staging to production`);
  }
}

export function registerPromoteDeploymentMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `onfinality.${PromoteDeployment.name}`,
    {
      description: PromoteDeployment.description,
      inputSchema: promoteInputs.shape,
      outputSchema: getMCPStructuredResponse(promoteOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      return promoteAdapter(args, logger);
    })
  );
}
