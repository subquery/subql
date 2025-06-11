// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {search, confirm, input} from '@inquirer/prompts';
import {Args, Command, Flags, Interfaces} from '@oclif/core';
import {ProjectNetworkConfig} from '@subql/types-core';
import chalk from 'chalk';
import fuzzy from 'fuzzy';
import ora from 'ora';
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

// Helper function for fuzzy search on prompt input
function filterInput<T>(arr: T[]) {
  return (input: string | undefined): Promise<ReadonlyArray<{value: T}>> => {
    input ??= '';
    return Promise.resolve(fuzzy.filter(input, arr).map((r) => ({value: r.original})));
  };
}

type InitFlags = Interfaces.InferredFlags<typeof Init.flags>;

export default class Init extends Command {
  static description = 'Initialize a SubQuery project from a template';

  static flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'Force using all the default options, except the name and network',
      default: false,
    }),
    location: Flags.string({char: 'l', description: 'local folder to create the project in'}),
    'install-dependencies': Flags.boolean({description: 'Install dependencies as well', default: false}),
    npm: Flags.boolean({description: 'Force using NPM instead of yarn, only works with `install-dependencies` flag'}),
    abiPath: Flags.string({description: 'A path to an ABI file that will be used to scaffold the project'}),
    network: Flags.string({description: 'The name of the network to initialise a project with'}),
    description: Flags.string({description: 'The description for your project'}),
    author: Flags.string({description: 'The author of the project, defaults to your computer username'}),
    endpoint: Flags.string({description: 'The RPC endpoint for your project'}),
  };

  static args = {
    projectName: Args.string({
      description: 'Give the starter project name',
    }),
  };

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Init);

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
      if (flags.abiPath) {
        await this.createProjectScaffold(projectPath, flags.abiPath);
      } else if (!flags.force) {
        const loadAbi = await confirm({
          message: 'Do you want to generate datasources and handlers from an existing contract ABI?',
          default: false,
        });

        if (loadAbi) {
          await this.createProjectScaffold(projectPath);
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

    const spinner = ora('Preparing project').start();
    await prepare(projectPath, project, isMultiChainProject);
    spinner.stop();
    if (flags['install-dependencies']) {
      const spinner = ora('Installing dependencies').start();
      installDependencies(projectPath, flags.npm);
      spinner.stop();
    }
    this.log(`${project.name} is ready${isMultiChainProject ? ' as a multi-chain project' : ''}`);

    return {isMultiChainProject};
  }

  async createProjectScaffold(projectPath: string, abiPath?: string): Promise<void> {
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
