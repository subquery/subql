// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {stripVTControlCharacters} from 'node:util';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {ProjectNetworkConfig} from '@subql/types-core';
import chalk from 'chalk';
import {z} from 'zod';
import {
  commandLogger,
  getMCPWorkingDirectory,
  Logger,
  makeCLIPrompt,
  makeMCPElicitPrmompt,
  mcpLogger,
  MCPToolOptions,
  Prompt,
  zodToArgs,
  zodToFlags,
} from '../adapters/utils';
import {
  installDependencies,
  cloneProjectTemplate,
  readDefaults,
  prepare,
  fetchNetworks,
  fetchExampleProjects,
  ExampleProjectInterface,
  Template,
} from '../controller/init-controller';
import {ProjectSpecBase} from '../types';
import {resolveToAbsolutePath} from '../utils';

const initInputs = z.object({
  name: z.string({description: 'The name of the project to create'}),
  location: z
    .string({description: 'The path to the project, this can be a directory or a project manifest file.'})
    .optional(),
  network: z.string({description: 'The name of the network the project will index data for'}).optional(),
  networkFamily: z
    .string({description: 'The network family the project will index data for, e.g. EVM, Substrate'})
    .optional(),
  endpoint: z.string({description: 'The RPC endpoint that the project will use'}).optional(),
  installDependencies: z.boolean({description: 'Install the dependencies of the project'}).optional().default(true),
  packageManager: z.enum(['npm', 'yarn', 'pnpm']).optional().default('npm'),
  author: z
    .string({description: 'The project author that will be set in package.json. Defaults to the current system user'})
    .optional(),
});
type InitInputs = z.infer<typeof initInputs>;

const initOutputs = z.object({
  projectPath: z.string({description: 'The absolute path to the created project'}),
});
type InitOutputs = z.infer<typeof initOutputs>;

function extractEndpoints(endpointConfig: ProjectNetworkConfig['endpoint']): string[] {
  if (typeof endpointConfig === 'string') {
    return [endpointConfig];
  }
  if (endpointConfig instanceof Array) {
    return endpointConfig;
  }
  return Object.keys(endpointConfig);
}

// Family needs to be provided because there can be the same network name in different families. eg Bittensor (Substrate and EVM)
function findNetwork(
  templates: Template[],
  network: string,
  family?: string
): [Template, Template['networks'][number]] {
  const selectedFamily = templates.find((f) => {
    if (family) {
      return f.name.toLowerCase() === family.toLowerCase();
    }
    return !!f.networks.find((n) => n.name.toLowerCase() === network.toLowerCase());
  });
  if (!selectedFamily) {
    throw new Error(`Network ${network} not found in the available templates`);
  }

  const selectedNetwork = selectedFamily.networks.find((v) => network.toLowerCase() === v.name.toLowerCase());
  if (!selectedNetwork) {
    throw new Error(`Network ${network} not found in the available templates`);
  }

  return [selectedFamily, selectedNetwork];
}

export async function initAdapter(
  workingDir: string,
  args: InitInputs,
  logger: Logger,
  prompt: Prompt | null
): Promise<InitOutputs> {
  const location = resolveToAbsolutePath(path.resolve(workingDir, args.location ?? ''));

  // TODO if the location includes the name, we can dedupe it
  if (fs.existsSync(path.join(location, `${args.name}`))) {
    throw new Error(`Directory ${args.name} exists, try another project name`);
  }

  const networkTemplates = await fetchNetworks();

  let network = args.network;
  let family = args.networkFamily;
  if (!network) {
    if (!prompt) {
      throw new Error('Please provide a network');
    }
    const networkStrArr = networkTemplates.flatMap((families) => {
      if (family && families.name.toLowerCase() !== family.toLowerCase()) return [];
      return families.networks.map((network) => `${network.name} ${chalk.gray(`(${families.name})`)}`);
    });

    const networkPrompt = await prompt({
      message: 'Select a network',
      type: 'string',
      options: networkStrArr,
    });

    const [rawNetwork, rawFamily] = stripVTControlCharacters(networkPrompt).split(' (');
    network = rawNetwork.trim();
    family ??= rawFamily ? rawFamily.replace(')', '').trim() : undefined;
  }

  const [selectedFamily, selectedNetwork] = findNetwork(networkTemplates, network, family);

  const candidateProjects = await fetchExampleProjects(selectedFamily.code, selectedNetwork.code);

  const joiner = ` - `;
  const candidateOptions = candidateProjects.map(
    (project) => `${project.name}${joiner}${chalk.gray(project.description)}`
  );

  // Only push other when prompts are available because it requires a user to input a URL
  if (prompt) {
    candidateOptions.push(`Other${joiner}${chalk.gray('Enter a git repo URL')}`);
  }

  const template = prompt
    ? await prompt({
        message: 'Select a template project',
        type: 'string',
        options: candidateOptions,
      })
    : candidateOptions[0];

  const templateName = stripVTControlCharacters(template).split(joiner)[0];
  let selectedProject: ExampleProjectInterface | undefined;
  if (templateName === 'Other' && prompt) {
    const url = await prompt({
      message: 'Enter a git repo URL',
      type: 'string',
      // required: true,
    });

    selectedProject = {
      remote: url,
      name: templateName,
      path: '',
      description: '',
    };
  } else {
    selectedProject = candidateProjects.find((project) => project.name === templateName);
  }

  assert(selectedProject, 'No project selected');
  const projectPath: string = await cloneProjectTemplate(location, args.name, selectedProject);
  const {endpoint: defaultEndpoint, isMultiChainProject} = await readDefaults(projectPath);

  const username = os.userInfo().username;
  const project = {
    name: args.name,
    author:
      args.author ??
      (await prompt?.({message: 'Author', required: false, defaultValue: username, type: 'string'})) ??
      username,
  } as ProjectSpecBase;

  if (!isMultiChainProject) {
    const projectEndpoints: string[] = extractEndpoints(defaultEndpoint);
    const endpoint =
      args.endpoint ??
      (await prompt?.({
        message: 'RPC endpoint',
        type: 'string',
        defaultValue: projectEndpoints[0],
        required: false,
      }));
    if (endpoint && !projectEndpoints.includes(endpoint)) {
      projectEndpoints.push(endpoint);
    }

    project.endpoint = projectEndpoints;
  }

  await prepare(projectPath, project, isMultiChainProject);

  if (args.installDependencies) {
    logger.info(`Installing dependencies`);
    installDependencies(projectPath, args.packageManager);
    logger.info(`Installed dependencies`);
  }

  return {
    projectPath,
  };
}

export default class Init extends Command {
  static description = 'Initialize a SubQuery project from a template';

  static flags = zodToFlags(initInputs.omit({name: true}));
  static args = zodToArgs(initInputs.pick({name: true}));

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Init);

    await initAdapter(process.cwd(), {...flags, ...args}, commandLogger(this), makeCLIPrompt());

    this.log('Project successfully created!');
  }
}

// Used when MCP doesn't support elicitInput
const nonInteractiveInitInputs = initInputs.required({name: true});

export function registerInitMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    Init.name,
    {
      description: Init.description,
      inputSchema: (opts.supportsElicitation ? initInputs : nonInteractiveInitInputs).shape,
      // outputSchema: initOutputs.shape, // TODO once we know the output we can add this
    },
    async (args, meta) => {
      const cwd = await getMCPWorkingDirectory(server);
      const logger = mcpLogger(server.server);

      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : null;
      const result = await initAdapter(cwd, args, logger, prompt);

      return {
        content: [
          {
            type: 'text',
            text: `Project created at ${result.projectPath}`,
          },
        ],
      };
    }
  );
}
