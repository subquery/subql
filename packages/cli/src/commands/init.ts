// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {URL} from 'url';
import {Command, Flags} from '@oclif/core';
import chalk from 'chalk';
import cli from 'cli-ux';
import fuzzy from 'fuzzy';
import * as inquirer from 'inquirer';
import {uniq} from 'lodash';
import {lt} from 'semver';
import {
  fetchTemplates,
  Template,
  installDependencies,
  cloneProjectTemplate,
  cloneProjectGit,
  readDefaults,
  prepare,
} from '../controller/init-controller';
import {getGenesisHash} from '../jsonrpc';
import {ProjectSpecBase, ProjectSpecV0_2_0} from '../types';
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const RECOMMEND_VERSION = '1.0.0';
enum NETWORK_FAMILIES {
  Avalanche = 'Avalanche',
  Substrate = 'Substrate',
}
// Helper function for fuzzy search on prompt input
function filterInput(arr: string[]) {
  return (_: any, input: string) => {
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

//

export default class Init extends Command {
  static description = 'Initialize a scaffold subquery project';

  static flags = {
    force: Flags.boolean({char: 'f'}),
    location: Flags.string({char: 'l', description: 'local folder to create the project in'}),
    'install-dependencies': Flags.boolean({description: 'Install dependencies as well', default: false}),
    npm: Flags.boolean({description: 'Force using NPM instead of yarn, only works with `install-dependencies` flag'}),
    specVersion: Flags.string({
      required: false,
      options: ['0.2.0', '1.0.0'],
      default: RECOMMEND_VERSION,
      description: 'The spec version to be used by the project',
    }),
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
  private networkFamily: NETWORK_FAMILIES;

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Init);

    if (lt(flags.specVersion, RECOMMEND_VERSION)) {
      this.log(
        `${chalk.yellow('WARNING')} Using specVersion ${
          flags.specVersion
        } is deprecated and in the future will be denied from being uploaded to the subquery hosted service. Consider initializing your project with specVersion ${RECOMMEND_VERSION}`
      );
    }

    this.location = flags.location ? path.resolve(flags.location) : process.cwd();
    this.project = {} as ProjectSpecBase;
    this.project.name = args.projectName
      ? args.projectName
      : await cli.prompt('Project name', {default: 'subql-starter', required: true});
    if (fs.existsSync(path.join(this.location, `${this.project.name}`))) {
      throw new Error(`Directory ${this.project.name} exists, try another project name`);
    }

    let templates: Template[];
    let selectedTemplate: Template;
    let selectedNetwork: string;

    templates = (await fetchTemplates()).filter(({specVersion}) => specVersion === flags.specVersion);
    await this.observeTemplates(templates, flags);

    //Family selection
    const families = uniq(templates.map(({family}) => family)).sort();
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
    templates = templates.filter(({family}) => family === this.networkFamily);
    await this.observeTemplates(templates, flags);

    // Network selection
    const networks = uniq(templates.map(({network}) => network)).sort();
    await inquirer
      .prompt([
        {
          name: 'networkResponse',
          message: 'Select a network',
          type: 'autocomplete',
          searchText: '',
          emptyText: 'Network not found',
          pageSize: 20,
          source: filterInput(networks),
        },
      ])
      .then(({networkResponse}) => {
        selectedNetwork = networkResponse;
      });
    const candidateTemplates = templates.filter(({network}) => network === selectedNetwork);
    await this.observeTemplates(candidateTemplates, flags);

    // Templates selection
    const paddingWidth = candidateTemplates.map(({name}) => name.length).reduce((acc, xs) => Math.max(acc, xs)) + 5;
    const templateDisplays = candidateTemplates.map(
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
          await this.observeTemplates([], flags);
        } else {
          selectedTemplate = templates.find(({name}) => name === templateName);
          flags.specVersion = selectedTemplate.specVersion;
        }
      });
    this.projectPath = await cloneProjectTemplate(this.location, this.project.name, selectedTemplate);
    await this.setupProject(flags);
  }
  // observe templates, if no option left or manually select use custom templates
  async observeTemplates(templates: Template[], flags: any): Promise<void> {
    if (templates.length === 0) {
      console.log(`!!!!!! use custom`);
      const [gitRemote, gitBranch] = await promptValidRemoteAndBranch();
      this.projectPath = await cloneProjectGit(this.location, this.project.name, gitRemote, gitBranch);
      await this.setupProject(flags);
    }
  }

  async setupProject(flags: any) {
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

    //TODO, only substrate family project should fetch its genesis hash, keep it this way for now
    if (this.networkFamily === NETWORK_FAMILIES.Substrate && flags.specVersion !== '0.0.1') {
      cli.action.start('Fetching network genesis hash');
      (this.project as ProjectSpecV0_2_0).genesisHash = await getGenesisHash(this.project.endpoint);
      cli.action.stop();
    }

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
    process.exit(0);
  }
}
