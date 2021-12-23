// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {URL} from 'url';
import {Command, flags} from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import fuzzy from 'fuzzy';
import * as inquirer from 'inquirer';
import {
  fetchTemplates,
  Template,
  createProjectFromGit,
  createProjectFromTemplate,
  installDependencies,
} from '../controller/init-controller';
import {getGenesisHash} from '../jsonrpc';
import {ProjectSpecBase, ProjectSpecV0_2_0} from '../types';

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
        default: 'https://github.com/subquery/subql-starter',
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
    default: 'v0.2.0',
  });
  return [remote, branch];
}

export default class Init extends Command {
  static description = 'Initialize a scaffold subquery project';

  static flags = {
    force: flags.boolean({char: 'f'}),
    location: flags.string({char: 'l', description: 'local folder to create the project in'}),
    'install-dependencies': flags.boolean({description: 'Install dependencies as well', default: false}),
    npm: flags.boolean({description: 'Force using NPM instead of yarn, only works with `install-dependencies` flag'}),
    specVersion: flags.string({
      required: false,
      options: ['0.0.1', '0.2.0'],
      default: '0.2.0',
      description: 'The spec version to be used by the project',
    }),
  };

  static args = [
    {
      name: 'projectName',
      description: 'Give the starter project name',
    },
  ];

  async run(): Promise<void> {
    const {args, flags} = this.parse(Init);
    const project = {} as ProjectSpecBase;

    const location = flags.location ? path.resolve(flags.location) : process.cwd();

    project.name = args.projectName
      ? args.projectName
      : await cli.prompt('Project name', {default: 'subql-starter', required: true});
    if (fs.existsSync(path.join(location, `${project.name}`))) {
      throw new Error(`Directory ${project.name} exists, try another project name`);
    }

    let skipFlag = false;
    let gitRemote: string;
    let branch: string;
    let templates: Template[];
    let selectedTemplate: Template;
    let selectedNetwork: string;

    try {
      templates = await fetchTemplates();
    } catch (e) {
      this.error(e);
    }

    const networks = templates
      .map(({network}) => network)
      .filter((n, i, self) => {
        return i === self.indexOf(n);
      });
    networks.push('Other');

    // Network
    inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
    await inquirer
      .prompt([
        {
          name: 'networkResponse',
          message: 'Select a network',
          type: 'autocomplete',
          searchText: '',
          emptyText: 'Network not found',
          source: filterInput(networks),
        },
      ])
      .then(({networkResponse}) => {
        if (networkResponse === 'Other') {
          skipFlag = true;
        } else {
          selectedNetwork = networkResponse;
        }
      });

    if (!skipFlag) {
      const candidateTemplates = templates.filter(({network}) => network === selectedNetwork);
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
        .then(({templateDisplay}) => {
          const templateName = (templateDisplay as string).split(' ')[0];
          if (templateName === 'Other') {
            skipFlag = true;
          } else {
            selectedTemplate = templates.find(({name}) => name === templateName);
            flags.specVersion = selectedTemplate.specVersion;
          }
        });

      if (skipFlag) {
        [gitRemote, branch] = await promptValidRemoteAndBranch();
      }
    } else {
      [gitRemote, branch] = await promptValidRemoteAndBranch();
    }

    if (selectedNetwork && !selectedTemplate) {
      const candidateEndpoints = templates
        .filter(({network}) => network === selectedNetwork)
        .map(({endpoint}) => endpoint);
      candidateEndpoints.push('Other');

      project.endpoint = await inquirer
        .prompt([
          {
            name: 'endpointResponse',
            message: 'Select a network endpoint',
            type: 'autocomplete',
            searchText: '',
            emptyText: 'Endpoint not found',
            source: filterInput(candidateEndpoints),
          },
        ])
        .then(async ({endpointResponse}) => {
          if (endpointResponse === 'Other') {
            return cli.prompt('RPC endpoint:', {
              default: 'wss://polkadot.api.onfinality.io/public-ws',
              required: true,
            });
          } else {
            return endpointResponse;
          }
        });
    } else {
      project.endpoint = await cli.prompt('RPC endpoint:', {
        default: selectedTemplate?.endpoint ?? 'wss://polkadot.api.onfinality.io/public-ws',
        required: true,
      });
    }

    // Package json repository
    project.repository = await cli.prompt('Git repository', {required: false});

    if (flags.specVersion === '0.2.0') {
      cli.action.start('Fetching network genesis hash');
      (project as ProjectSpecV0_2_0).genesisHash = await getGenesisHash(project.endpoint);
      cli.action.stop();
    }

    project.author = await cli.prompt('Author', {required: true});
    project.description = await cli.prompt('Description', {required: false});
    project.version = await cli.prompt('Version', {default: '1.0.0', required: true});
    project.license = await cli.prompt('License', {default: 'MIT', required: true});

    cli.action.start('Initializing the template project');
    let projectPath;
    try {
      if (selectedTemplate) {
        projectPath = await createProjectFromTemplate(location, project, selectedTemplate);
      } else if (gitRemote) {
        projectPath = await createProjectFromGit(location, project, gitRemote, branch);
      } else {
        throw new Error('Invalid initalization state, must select either a template project or provide a git remote');
      }
      cli.action.stop();
    } catch (e) {
      cli.action.stop();
      this.error(e);
    }
    if (flags['install-dependencies']) {
      cli.action.start('Installing dependencies');
      installDependencies(projectPath, flags.npm);
      cli.action.stop();
    }

    this.log(`${project.name} is ready`);
    process.exit(0);
  }
}
