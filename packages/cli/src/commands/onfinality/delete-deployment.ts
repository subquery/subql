// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {getMCPStructuredResponse, withStructuredResponse, zodToFlags} from '../../adapters/utils';
import {ROOT_API_URL_PROD} from '../../constants';
import {deleteDeployment} from '../../controller/deploy-controller';
import {checkToken} from '../../utils';

const deleteDeploymentInputs = z.object({
  org: z.string({description: 'Github organization name'}),
  projectName: z.string({description: 'Project name'}),
  deploymentID: z.number({description: 'Deployment ID'}),
});
type DeleteDeploymentInputs = z.infer<typeof deleteDeploymentInputs>;

const deleteDeploymentOutputs = z.object({
  deploymentID: z.number({description: 'The ID of the deleted deployment'}),
});

async function deleteDeploymentAdapter(args: DeleteDeploymentInputs): Promise<z.infer<typeof deleteDeploymentOutputs>> {
  const authToken = await checkToken();

  await deleteDeployment(args.org, args.projectName, authToken, args.deploymentID, ROOT_API_URL_PROD);
  return {deploymentID: args.deploymentID};
}

export default class DeleteDeployment extends Command {
  static description = 'Delete a deployment from the OnFinality managed services';
  static flags = zodToFlags(deleteDeploymentInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(DeleteDeployment);

    const {deploymentID} = await deleteDeploymentAdapter(flags);
    this.log(`Deleted deployment: ${deploymentID}`);
  }
}

export function deleteDeploymentMCPAdapter(server: McpServer): RegisteredTool {
  return server.registerTool(
    `onfinality.${DeleteDeployment.name}`,
    {
      description: DeleteDeployment.description,
      inputSchema: deleteDeploymentInputs.shape,
      outputSchema: getMCPStructuredResponse(deleteDeploymentOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      return deleteDeploymentAdapter(args);
    })
  );
}
