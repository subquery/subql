// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {URL} from 'url';
import {Command, Flags} from '@oclif/core';
import {NETWORK_FAMILY} from '@subql/common';
import chalk from 'chalk';
import cli from 'cli-ux';
import fuzzy from 'fuzzy';
import * as inquirer from 'inquirer';
import {uniq} from 'lodash';
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
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

// Helper function for fuzzy search on prompt input
function filterInput(arr: string[]) {
  return (_: string, input: string) => {
    input = input || '';
    return new Promise((resolve) => {
      resolve(
        fuzzy.filter(input, arr).map((el) => {
          return el.original;
        })
      );
    });
  };
}

async function promptValidRemoteAndBranch(): Promise<string[]> {
  let isValid = false;
  let remote: string;
  while (!isValid) {
    try {
      remote = await cli.prompt('Custom template git remote', {
        required: true,
      });
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

  static args = [
    {
      name: 'projectName',
      description: 'Give the starter project name',
    },
  ];
  private projectPath: string; //path on GitHub
  private project: ProjectSpecBase;
  private location: string;
  private networkFamily: NETWORK_FAMILY;
  private network: string;

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Init);

    this.location = flags.location ? resolveToAbsolutePath(flags.location) : process.cwd();
    this.project = {} as ProjectSpecBase;
    this.project.name = args.projectName
      ? args.projectName
      : await cli.prompt('Project name', {default: 'subql-starter', required: true});
    if (fs.existsSync(path.join(this.location, `${this.project.name}`))) {
      throw new Error(`Directory ${this.project.name} exists, try another project name`);
    }

    const networkTemplates = await fetchNetworks();

    //Family selection
    const families = uniq(networkTemplates.map(({name}) => name)).sort();
    await inquirer
      .prompt([
        {
          name: 'familyResponse',
          message: 'Select a network family',
          type: 'autocomplete',
          searchText: '',
          emptyText: 'Network family not found',
          pageSize: 20,
          source: filterInput(families),
        },
      ])
      .then(({familyResponse}) => {
        this.networkFamily = familyResponse;
      });

    // if network family is of ethereum, then should prompt them an abiPath
    const selectedFamily = networkTemplates.find((family) => family.name === this.networkFamily);

    // Network selection
    const networks = uniq(selectedFamily.networks).sort();

    const networkStrArr = networks.map((n) => n.name);

    await inquirer
      .prompt([
        {
          name: 'networkResponse',
          message: 'Select a network',
          type: 'autocomplete',
          searchText: '',
          emptyText: 'Network not found',
          pageSize: 20,
          source: filterInput(networkStrArr),
        },
      ])
      .then(({networkResponse}) => {
        this.network = networkResponse;
      });
    const selectedNetwork = networks.find((network) => this.network === network.name);

    const candidateProjects = await fetchExampleProjects(selectedFamily.code, selectedNetwork.code);

    let selectedProject: ExampleProjectInterface;
    // Templates selection
    const paddingWidth = candidateProjects.map(({name}) => name.length).reduce((acc, xs) => Math.max(acc, xs)) + 5;
    const templateDisplays = candidateProjects.map(
      ({description, name}) => `${name.padEnd(paddingWidth, ' ')}${chalk.gray(description)}`
    );
    templateDisplays.push(`${'Other'.padEnd(paddingWidth, ' ')}${chalk.gray('Enter a custom git endpoint')}`);
    await inquirer
      .prompt([
        {
          name: 'templateDisplay',
          message: 'Select a template project',
          type: 'autocomplete',
          searchText: '',
          emptyText: 'Template not found',
          source: filterInput(templateDisplays),
        },
      ])
      .then(async ({templateDisplay}) => {
        const templateName = (templateDisplay as string).split(' ')[0];
        if (templateName === 'Other') {
          await this.cloneCustomRepo();
        } else {
          selectedProject = candidateProjects.find((project) => project.name === templateName);
        }
      });
    this.projectPath = await cloneProjectTemplate(this.location, this.project.name, selectedProject);
    await this.setupProject(flags);

    if (validateEthereumProjectManifest(this.projectPath)) {
      const {loadAbi} = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'loadAbi',
          message: 'Do you want to generate scaffolding from an existing contract abi?',
          default: false,
        },
      ]);

      if (loadAbi) {
        await this.createProjectScaffold();
      }
    }
  }

  async cloneCustomRepo(): Promise<void> {
    const [gitRemote, gitBranch] = await promptValidRemoteAndBranch();
    this.projectPath = await cloneProjectGit(this.location, this.project.name, gitRemote, gitBranch);
  }

  async setupProject(flags: any): Promise<void> {
    const [
      defaultSpecVersion,
      defaultRepository,
      defaultEndpoint,
      defaultAuthor,
      defaultVersion,
      defaultDescription,
      defaultLicense,
    ] = await readDefaults(this.projectPath);

    // Should use template specVersion as default, otherwise use user provided
    flags.specVersion = defaultSpecVersion ?? flags.specVersion;

    this.project.endpoint = await cli.prompt('RPC endpoint:', {
      default: defaultEndpoint ?? 'wss://polkadot.api.onfinality.io/public-ws',
      required: true,
    });

    this.project.repository = await cli.prompt('Git repository', {required: false, default: defaultRepository});

    const descriptionHint = defaultDescription.substring(0, 40).concat('...');
    this.project.author = await cli.prompt('Author', {required: true, default: defaultAuthor});
    this.project.description = await cli
      .prompt('Description', {
        required: false,
        default: descriptionHint,
      })
      .then((description) => {
        return description === descriptionHint ? defaultDescription : description;
      });

    this.project.version = await cli.prompt('Version', {required: true, default: defaultVersion});
    this.project.license = await cli.prompt('License', {required: true, default: defaultLicense});

    cli.action.start('Preparing project');
    await prepare(this.projectPath, this.project);
    cli.action.stop();
    if (flags['install-dependencies']) {
      cli.action.start('Installing dependencies');
      installDependencies(this.projectPath, flags.npm);
      cli.action.stop();
    }
    this.log(`${this.project.name} is ready`);
  }
  async createProjectScaffold(): Promise<void> {
    await prepareProjectScaffold(this.projectPath);

    const {abiFilePath} = await inquirer.prompt([
      {
        type: 'input',
        name: 'abiFilePath',
        message: 'Path to ABI',
      },
    ]);

    const {contractAddress} = await inquirer.prompt([
      {
        type: 'input',
        name: 'contractAddress',
        message: 'Please provide a contract address (optional)',
      },
    ]);

    const {startBlock} = await inquirer.prompt([
      {
        type: 'input',
        name: 'startBlock',
        message: 'Please provide startBlock when the contract was deployed or first used',
        default: 1,
      },
    ]);

    this.log(`Generating scaffold handlers and manifest from ${abiFilePath}`);

    await Generate.run([
      '-f',
      this.projectPath,
      '--abiPath',
      `${abiFilePath}`,
      '--address',
      `${contractAddress}`,
      '--startBlock',
      `${startBlock}`,
    ]);
  }
}
