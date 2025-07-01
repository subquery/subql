// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {search, confirm, input} from '@inquirer/prompts';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Args, Command, Flags, Interfaces} from '@oclif/core';
import {ProjectNetworkConfig} from '@subql/types-core';
import chalk from 'chalk';
import fuzzy from 'fuzzy';
import ora from 'ora';
import {FORCE_FLAG, MCP_FLAG} from '../constants';
import {
  installDependencies,
  cloneProjectTemplate,
  readDefaults,
  prepare,
  prepareProjectScaffold,
  validateEthereumProjectManifest,
  fetchNetworks,
  fetchExampleProjects,
  ExampleProjectInterface,
} from '../controller/init-controller';
import {ProjectSpecBase} from '../types';
import {resolveToAbsolutePath} from '../utils';
import Generate from './codegen/generate';
import {z} from 'zod';
import {
  commandLogger,
  Logger,
  makeCLIPrompt,
  makeInputSchema,
  makeMCPElicitPrmompt,
  mcpInputs,
  mcpLogger,
  Prompt,
  zodToArgs,
  zodToFlags,
} from '../adapters/utils';

const initInputs = z.object({
  name: z.string({description: 'The name of the project to create'}),
  location: z.string({description: 'The path to the project, this can be a directory or a project manifest file.'}),
  network: z.string({description: 'The name of the network the project will index data for'}).optional(),
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

export async function initAdapter(args: InitInputs, logger: Logger, prompt?: Prompt): Promise<InitOutputs> {
  const location = resolveToAbsolutePath(args.location);

  // TODO if the location includes the name, we can dedupe it
  if (fs.existsSync(path.join(location, `${args.name}`))) {
    throw new Error(`Directory ${args.name} exists, try another project name`);
  }

  const networkTemplates = await fetchNetworks();

  let network = args.network;
  if (!network) {
    const networkStrArr = networkTemplates.flatMap((families) => {
      return families.networks.map((network) => network.name);
    });

    if (!prompt) {
      throw new Error('Please provide a network');
    }

    network = await prompt({
      message: 'Select a network',
      type: 'string',
      options: networkStrArr,
    });
  }

  const selectedFamily = networkTemplates.find(
    (family) => !!family.networks.find((n) => n.name.toLowerCase() === network.toLowerCase())
  );
  if (!selectedFamily) {
    throw new Error(`Network ${network} not found in the available templates`);
  }

  const selectedNetwork = selectedFamily.networks.find((v) => network.toLowerCase() === v.name.toLowerCase());
  if (!selectedNetwork) {
    throw new Error(`Network ${network} not found in the available templates`);
  }

  const candidateProjects = await fetchExampleProjects(selectedFamily.code, selectedNetwork.code);

  const joiner = ` - `;
  const candidateOptions = candidateProjects.map((project) => `${project.name}${joiner}${project.description}`);

  // Only push other when prompts are available because it requires a user to input a URL
  if (prompt) {
    candidateOptions.push('Other');
  }

  const template = prompt
    ? await prompt({
        message: 'Select a template project',
        type: 'string',
        options: candidateOptions,
      })
    : candidateOptions[0];

  const templateName = template.split(joiner)[0];
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
  // const projectPath: string = await cloneProjectTemplate(location, args.name, selectedProject);
  // const {isMultiChainProject} = await this.setupProject(project, projectPath, flags);
  // if (isMultiChainProject) {
  //   logger.info('Multi-chain project successfully created!');
  // }

  return {
    projectPath: '',
  };
}

// Used when MCP doesn't support elicitInput
const nonInteractiveInitInputs = initInputs.required({name: true});

export function registerInitMCPTool(server: McpServer, supportsElititation = false): RegisteredTool {
  return server.registerTool(
    Init.id,
    {
      description: Init.description,
      inputSchema: (supportsElititation ? initInputs : nonInteractiveInitInputs).merge(mcpInputs).shape,
      // outputSchema: initOutputs.shape, // TODO once we know the output we can add this
    },
    async (args, meta) => {
      const {cwd, location, ...rest} = args;
      const newLocation = path.resolve(cwd, location);
      const logger = mcpLogger(server.server);

      const prompt = supportsElititation ? makeMCPElicitPrmompt(server) : undefined;
      const result = await initAdapter({...rest, location: newLocation}, logger, prompt);

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

export default class Init extends Command {
  static description = 'Initialize a SubQuery project from a template';

  static flags = zodToFlags(initInputs.omit({name: true}).partial({location: true}));
  static args = zodToArgs(initInputs.pick({name: true}));

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Init);

    const location = flags.location ?? process.cwd();

    await initAdapter({...flags, ...args, location}, commandLogger(this), makeCLIPrompt());

    this.log('Project successfully created!');
  }
}

// Helper function for fuzzy search on prompt input
function filterInput<T>(arr: T[]) {
  return (input: string | undefined): Promise<ReadonlyArray<{value: T}>> => {
    input ??= '';
    return Promise.resolve(fuzzy.filter(input, arr).map((r) => ({value: r.original})));
  };
}

type InitFlags = Interfaces.InferredFlags<typeof InitOld.flags>;

export class InitOld extends Command {
  static description = 'Initialize a SubQuery project from a template';

  static flags = {
    force: FORCE_FLAG,
    location: Flags.string({char: 'l', description: 'local folder to create the project in'}),
    'install-dependencies': Flags.boolean({description: 'Install dependencies as well', default: false}),
    npm: Flags.boolean({
      description: 'Force using NPM instead of yarn, only works with `install-dependencies` flag',
      dependsOn: ['install-dependencies'],
    }),
    abiPath: Flags.string({description: 'A path to an ABI file that will be used to scaffold the project'}),
    network: Flags.string({description: 'The name of the network to initialise a project with'}),
    description: Flags.string({description: 'The description for your project'}),
    author: Flags.string({description: 'The author of the project, defaults to your computer username'}),
    endpoint: Flags.string({description: 'The RPC endpoint for your project'}),
    mcp: MCP_FLAG,
  };

  static args = {
    projectName: Args.string({
      description: 'Give the starter project name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const {args, flags} = await this.parse(InitOld);

    const location = flags.location ? resolveToAbsolutePath(flags.location) : process.cwd();
    const project = {} as ProjectSpecBase;
    project.name = args.projectName
      ? args.projectName
      : await input({
          message: 'Project name',
          default: 'subql-starter',
          required: true,
        });
    if (fs.existsSync(path.join(location, `${project.name}`))) {
      throw new Error(`Directory ${project.name} exists, try another project name`);
    }

    const networkTemplates = await fetchNetworks();

    let network = flags.network;
    if (!network) {
      const networkStrArr = networkTemplates.flatMap((families) => {
        return families.networks.map((network) => network.name);
      });

      network = await search<string>({
        message: 'Select a network',
        source: filterInput(networkStrArr),
        pageSize: 20,
      });
    }

    const selectedFamily = networkTemplates.find(
      (family) => !!family.networks.find((n) => n.name.toLowerCase() === network.toLowerCase())
    );
    if (!selectedFamily) {
      throw new Error(`Network ${network} not found in the available templates`);
    }

    const selectedNetwork = selectedFamily.networks.find((v) => network.toLowerCase() === v.name.toLowerCase());
    if (!selectedNetwork) {
      throw new Error(`Network ${network} not found in the available templates`);
    }

    const candidateProjects = await fetchExampleProjects(selectedFamily.code, selectedNetwork.code);

    let selectedProject: ExampleProjectInterface | undefined;
    // Templates selection
    const paddingWidth = candidateProjects.map(({name}) => name.length).reduce((acc, xs) => Math.max(acc, xs)) + 5;
    const templateDisplays = candidateProjects.map(
      ({description, name}) => `${name.padEnd(paddingWidth, ' ')}${chalk.gray(description)}`
    );
    templateDisplays.push(`${'Other'.padEnd(paddingWidth, ' ')}${chalk.gray('Enter a custom git endpoint')}`);

    const templateDisplay = flags.force
      ? templateDisplays[0]
      : await search<string>({
          message: 'Select a template project',
          source: filterInput(templateDisplays),
          pageSize: 20,
        });

    const templateName = (templateDisplay as string).split(' ')[0];
    if (templateName === 'Other') {
      const url = await input({
        message: 'Enter a git repo URL',
        required: true,
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
    const projectPath: string = await cloneProjectTemplate(location, project.name, selectedProject);
    const {isMultiChainProject} = await this.setupProject(project, projectPath, flags);
    if (isMultiChainProject) {
      this.log('Multi-chain project successfully created!');
      return;
    }

    if (await validateEthereumProjectManifest(projectPath)) {
      const extraFlags = flags.mcp ? ['--mcp'] : [];
      if (flags.abiPath) {
        await this.createProjectScaffold(projectPath, flags.abiPath, extraFlags);
      } else if (!flags.force) {
        const loadAbi = await confirm({
          message: 'Do you want to generate datasources and handlers from an existing contract ABI?',
          default: false,
        });

        if (loadAbi) {
          await this.createProjectScaffold(projectPath, undefined, extraFlags);
        }
      }
    }

    this.log('Project successfully created!');
  }

  async setupProject(
    project: ProjectSpecBase,
    projectPath: string,
    flags: InitFlags
  ): Promise<{isMultiChainProject: boolean}> {
    const {
      description: defaultDescription,
      endpoint: defaultEndpoint,
      isMultiChainProject,
    } = await readDefaults(projectPath);

    if (!isMultiChainProject) {
      const projectEndpoints: string[] = this.extractEndpoints(defaultEndpoint);
      if (!flags.force) {
        const userInput =
          flags.endpoint ??
          (await input({
            message: 'RPC endpoint:',
            default: projectEndpoints[0],
            required: false,
          }));
        if (!projectEndpoints.includes(userInput)) {
          projectEndpoints.push(userInput);
        }
      }

      project.endpoint = projectEndpoints;
    }

    const username = os.userInfo().username;
    if (flags.author) {
      project.author = flags.author;
    } else if (flags.force) {
      project.author = username;
    } else {
      project.author = await input({message: 'Author', required: true, default: username});
    }

    const descriptionHint = defaultDescription.substring(0, 40).concat('...');
    if (flags.description) {
      project.description = flags.description;
    } else if (flags.force) {
      project.description = defaultDescription;
    } else {
      project.description = await input({
        message: 'Description',
        required: false,
        default: descriptionHint,
      }).then((description) => {
        return description === descriptionHint ? defaultDescription : description;
      });
    }

    const spinner = ora({text: 'Preparing project', isSilent: flags.mcp}).start();
    await prepare(projectPath, project, isMultiChainProject);
    spinner.stop();
    if (flags['install-dependencies']) {
      const spinner = ora({text: 'Installing dependencies', isSilent: flags.mcp}).start();
      installDependencies(projectPath, flags.npm, flags.mcp);
      spinner.stop();
    }
    this.log(`${project.name} is ready${isMultiChainProject ? ' as a multi-chain project' : ''}`);

    return {isMultiChainProject};
  }

  async createProjectScaffold(projectPath: string, abiPath?: string, extraFlags: string[] = []): Promise<void> {
    await prepareProjectScaffold(projectPath);

    const abiFilePath =
      abiPath ??
      (await input({
        message: 'Path to ABI',
      }));

    // If user doesn't enter anything skip the generation
    if (!abiFilePath) {
      this.log('ABI not provided. You can add ABIs at a later stage with the `import-abi` command.');
      return;
    }

    const contractAddress = await input({
      message: 'Please provide a contract address (optional)',
    });

    const startBlock = await input({
      message: 'Please provide startBlock when the contract was deployed or first used',
      default: '1',
    });

    const cleanedContractAddress = contractAddress.replace(/[`'"]/g, '');

    this.log(`Generating handlers and manifest from ${abiFilePath}`);
    await Generate.run([
      '-f',
      projectPath,
      '--abiPath',
      `${abiFilePath}`,
      '--address',
      `${cleanedContractAddress}`,
      '--startBlock',
      `${startBlock}`,
      ...extraFlags,
    ]);
  }

  extractEndpoints(endpointConfig: ProjectNetworkConfig['endpoint']): string[] {
    if (typeof endpointConfig === 'string') {
      return [endpointConfig];
    }
    if (endpointConfig instanceof Array) {
      return endpointConfig;
    }
    return Object.keys(endpointConfig);
  }
}
