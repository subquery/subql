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
import {BASE_PROJECT_URL, ROOT_API_URL_PROD} from '../../constants';
import {createProject} from '../../controller/project-controller';
import {checkToken} from '../../utils';

const createProjectInputs = z.object({
  org: z.string({description: 'Github organization name'}),
  projectName: z.string({description: 'Project name'}),
  logoURL: z.string({description: 'Logo URL'}).optional(),
  subtitle: z.string({description: 'Subtitle'}).optional(),
  description: z.string({description: 'Description'}).optional(),
  dedicatedDB: z.string({description: 'Dedicated DataBase'}).optional(),
  projectType: z
    .enum(['subquery', 'subgraph'], {
      description: 'Project type [subquery|subgraph]',
    })
    .optional()
    .default('subquery'),
});
type CreateProjectInputs = z.infer<typeof createProjectInputs>;

const createProjectOutputs = z.object({
  url: z.string({description: 'The URL to the created project'}),
});

async function createProjectAdapter(
  args: CreateProjectInputs,
  logger: Logger
): Promise<z.infer<typeof createProjectOutputs>> {
  const authToken = await checkToken();

  const result = await createProject(ROOT_API_URL_PROD, authToken, {
    apiVersion: 'v3',
    description: args.description,
    key: `${args.org}/${args.projectName}`,
    logoUrl: args.logoURL,
    name: args.projectName,
    subtitle: args.subtitle,
    dedicateDBKey: args.dedicatedDB,
    tag: [],
    type: args.projectType === 'subquery' ? 1 : 3,
  });

  const [account, name] = result.key.split('/');

  return {url: `${BASE_PROJECT_URL}/orgs/${account}/projects/${name}/deployments`};
}

export default class CreateProject extends Command {
  static description = 'Create a project on the OnFinality managed services';
  static flags = zodToFlags(createProjectInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(CreateProject);

    const {url} = await createProjectAdapter(flags, commandLogger(this));

    this.log(`Successfully created project. You can view it at: ${url}`);
  }
}

export function registerCreateProjectMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `onfinality.${CreateProject.name}`,
    {
      description: CreateProject.description,
      inputSchema: createProjectInputs.shape,
      outputSchema: getMCPStructuredResponse(createProjectOutputs).shape,
    },
    withStructuredResponse(async (args, meta) => {
      const logger = mcpLogger(server.server);
      return createProjectAdapter(args, logger);
    })
  );
}
