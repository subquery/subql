// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {zodToFlags} from '../../adapters/utils';
import {ROOT_API_URL_PROD} from '../../constants';
import {deleteProject} from '../../controller/project-controller';
import {checkToken} from '../../utils';

const deleteProjectInputs = z.object({
  org: z.string({description: 'The Github organization name'}),
  projectName: z.string({description: 'The project name'}),
});
type DeleteProjectInputs = z.infer<typeof deleteProjectInputs>;

const deleteProjectOutputs = z.void();

async function deleteProjectAdapter(args: DeleteProjectInputs): Promise<z.infer<typeof deleteProjectOutputs>> {
  const authToken = await checkToken();
  await deleteProject(authToken, args.org, args.projectName, ROOT_API_URL_PROD);
}

export default class DeleteProject extends Command {
  static description = 'Delete a project on the OnFinality managed services';
  static flags = zodToFlags(deleteProjectInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(DeleteProject);

    await deleteProjectAdapter(flags);

    this.log(`Project: ${flags.org}/${flags.projectName} has been deleted`);
  }
}

export function registerDeleteProjectMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `onfinality.${DeleteProject.name}`,
    {
      description: DeleteProject.description,
      inputSchema: deleteProjectInputs.shape,
    },
    async (args) => {
      await deleteProjectAdapter(args);

      return {
        content: [
          {
            type: 'text',
            text: `Project: ${args.org}/${args.projectName} has been deleted`,
          },
        ],
      };
    }
  );
}
