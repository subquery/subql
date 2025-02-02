// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {search, confirm, input} from '@inquirer/prompts';
import {Args, Command, Flags} from '@oclif/core';
import {NETWORK_FAMILY} from '@subql/common';
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

export default class Init extends Command {
  static description = 'Initialize a scaffold subquery project';

  static flags = {
    force: Flags.boolean({char: 'f'}),
    location: Flags.string({char: 'l', description: 'local folder to create the project in'}),
    'install-dependencies': Flags.boolean({description: 'Install dependencies as well', default: false}),
    npm: Flags.boolean({description: 'Force using NPM instead of yarn, only works with `install-dependencies` flag'}),
    abiPath: Flags.string({description: 'path to abi file'}),
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

    //Family selection
    const families = networkTemplates.map(({name}) => name);

    const networkFamily = await search<NETWORK_FAMILY>({
      message: 'Select a network family',
      source: filterInput<NETWORK_FAMILY>(families as NETWORK_FAMILY[]),
      pageSize: 20,
    });

    // if network family is of ethereum, then should prompt them an abiPath
    const selectedFamily = networkTemplates.find((family) => family.name === networkFamily);
    assert(selectedFamily, 'No network family selected');

    // Network selection
    const networkStrArr = selectedFamily.networks.map((n) => n.name);

    const network = await search<string>({
      message: 'Select a network',
      source: filterInput(networkStrArr),
      pageSize: 20,
    });

    const selectedNetwork = selectedFamily.networks.find((v) => network === v.name);
    assert(selectedNetwork, 'No network selected');

    const candidateProjects = await fetchExampleProjects(selectedFamily.code, selectedNetwork.code);

    let selectedProject: ExampleProjectInterface | undefined;
    // Templates selection
    const paddingWidth = candidateProjects.map(({name}) => name.length).reduce((acc, xs) => Math.max(acc, xs)) + 5;
    const templateDisplays = candidateProjects.map(
      ({description, name}) => `${name.padEnd(paddingWidth, ' ')}${chalk.gray(description)}`
    );
    templateDisplays.push(`${'Other'.padEnd(paddingWidth, ' ')}${chalk.gray('Enter a custom git endpoint')}`);

    const templateDisplay = await search<string>({
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
    if (isMultiChainProject) return;

    if (await validateEthereumProjectManifest(projectPath)) {
      const loadAbi = await confirm({
        message: 'Do you want to generate scaffolding from an existing contract abi?',
        default: false,
      });

      if (loadAbi) {
        await this.createProjectScaffold(projectPath);
      }
    }
  }

  async setupProject(
    project: ProjectSpecBase,
    projectPath: string,
    flags: {npm: boolean; 'install-dependencies': boolean}
  ): Promise<{isMultiChainProject: boolean}> {
    const {
      author: defaultAuthor,
      description: defaultDescription,
      endpoint: defaultEndpoint,
      isMultiChainProject,
    } = await readDefaults(projectPath);

    if (!isMultiChainProject) {
      const projectEndpoints: string[] = this.extractEndpoints(defaultEndpoint);
      const userInput = await input({
        message: 'RPC endpoint:',
        default: projectEndpoints[0],
        required: false,
      });
      if (!projectEndpoints.includes(userInput)) {
        projectEndpoints.push(userInput);
      }

      project.endpoint = projectEndpoints;
    }
    const descriptionHint = defaultDescription.substring(0, 40).concat('...');
    project.author = await input({message: 'Author', required: true, default: defaultAuthor});
    project.description = await input({
      message: 'Description',
      required: false,
      default: descriptionHint,
    }).then((description) => {
      return description === descriptionHint ? defaultDescription : description;
    });

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

  async createProjectScaffold(projectPath: string): Promise<void> {
    await prepareProjectScaffold(projectPath);

    const abiFilePath = await input({
      message: 'Path to ABI',
    });

    const contractAddress = await input({
      message: 'Please provide a contract address (optional)',
    });

    const startBlock = await input({
      message: 'Please provide startBlock when the contract was deployed or first used',
      default: '1',
    });

    const cleanedContractAddress = contractAddress.replace(/[`'"]/g, '');

    this.log(`Generating scaffold handlers and manifest from ${abiFilePath}`);
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
