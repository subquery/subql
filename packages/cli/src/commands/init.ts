// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {URL} from 'url';
import {search, confirm, input} from '@inquirer/prompts';
import {Args, Command, Flags} from '@oclif/core';
import {NETWORK_FAMILY} from '@subql/common';
import chalk from 'chalk';
import cli from 'cli-ux';
import fuzzy from 'fuzzy';
import {
  installDependencies,
  cloneProjectTemplate,
  cloneProjectGit,
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
  return (input: string | undefined, opt: {signal: any}): Promise<ReadonlyArray<{value: T}>> => {
    input ??= '';
    return Promise.resolve(fuzzy.filter(input, arr).map((r) => ({value: r.original})));
  };
}

async function promptValidRemoteAndBranch(): Promise<string[]> {
  let isValid = false;
  let remote: string | undefined;
  while (!isValid) {
    try {
      remote = (await cli.prompt('Custom template git remote', {
        required: true,
      })) as string;
      new URL(remote);
      isValid = true;
    } catch (e) {
      console.log(`Not a valid git remote URL: '${remote}', try again`);
      continue;
    }
  }
  const branch = await cli.prompt('Custom template git branch', {
    required: true,
  });
  return [remote, branch];
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
      : await cli.prompt('Project name', {default: 'subql-starter', required: true});
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

    await this.setupProject(project, projectPath, flags);

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

  async cloneCustomRepo(project: ProjectSpecBase, projectPath: string, location: string): Promise<void> {
    const [gitRemote, gitBranch] = await promptValidRemoteAndBranch();
    projectPath = await cloneProjectGit(location, project.name, gitRemote, gitBranch);
  }

  async setupProject(project: ProjectSpecBase, projectPath: string, flags: any): Promise<void> {
    const [defaultEndpoint, defaultAuthor, defaultDescription] = await readDefaults(projectPath);

    project.endpoint = !Array.isArray(defaultEndpoint) ? [defaultEndpoint] : defaultEndpoint;
    const userInput = await cli.prompt('RPC endpoint:', {
      default: defaultEndpoint[0] ?? 'wss://polkadot.api.onfinality.io/public-ws',
      required: false,
    });
    if (!project.endpoint.includes(userInput)) {
      (project.endpoint as string[]).push(userInput);
    }
    const descriptionHint = defaultDescription.substring(0, 40).concat('...');
    project.author = await cli.prompt('Author', {required: true, default: defaultAuthor});
    project.description = await cli
      .prompt('Description', {
        required: false,
        default: descriptionHint,
      })
      .then((description) => {
        return description === descriptionHint ? defaultDescription : description;
      });

    cli.action.start('Preparing project');
    await prepare(projectPath, project);
    cli.action.stop();
    if (flags['install-dependencies']) {
      cli.action.start('Installing dependencies');
      installDependencies(projectPath, flags.npm);
      cli.action.stop();
    }
    this.log(`${project.name} is ready`);
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
}
