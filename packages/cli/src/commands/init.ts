// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {URL} from 'url';
import {Command, flags} from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import fuzzy from 'fuzzy';
import * as inquirer from 'inquirer';
import {uniq} from 'lodash';
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

    if (flags.specVersion === '0.0.1') {
      this.log(
        `${chalk.yellow(
          'WARNING'
        )} Using specVersion v0.0.1 is deprecated and in the future will be denied from being uploaded to the subquery hosted service. Consider initializing your project with specVersion v0.2.0`
      );
    }

    const project = {} as ProjectSpecBase;
    const location = flags.location ? path.resolve(flags.location) : process.cwd();

    project.name = args.projectName
      ? args.projectName
      : await cli.prompt('Project name', {default: 'subql-starter', required: true});
    if (fs.existsSync(path.join(location, `${project.name}`))) {
      throw new Error(`Directory ${project.name} exists, try another project name`);
    }

    let useCustomTemplate = false;
    let gitRemote: string;
    let gitBranch: string;
    let templates: Template[];
    let selectedTemplate: Template;
    let selectedNetwork: string;

    try {
      templates = await fetchTemplates();
    } catch (e) {
      this.error(e);
    }

    templates = templates.filter(({specVersion}) => specVersion === flags.specVersion);

    // Fallback to custom prompt if templates remote is empty
    if (templates.length === 0) {
      useCustomTemplate = true;
    }

    if (!useCustomTemplate) {
      const networks = uniq(templates.map(({network}) => network)).sort();
      // Network selection
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
          if (networkResponse === 'Other') {
            useCustomTemplate = true;
          } else {
            selectedNetwork = networkResponse;
          }
        });

      if (!useCustomTemplate) {
        const candidateTemplates = templates.filter(({network}) => network === selectedNetwork);
        const paddingWidth = candidateTemplates.map(({name}) => name.length).reduce((acc, xs) => Math.max(acc, xs)) + 5;

        const templateDisplays = candidateTemplates.map(
          ({description, name}) => `${name.padEnd(paddingWidth, ' ')}${chalk.gray(description)}`
        );
        templateDisplays.push(`${'Other'.padEnd(paddingWidth, ' ')}${chalk.gray('Enter a custom git endpoint')}`);

        // Network selection
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
              useCustomTemplate = true;
            } else {
              selectedTemplate = templates.find(({name}) => name === templateName);
              flags.specVersion = selectedTemplate.specVersion;
            }
          });

        if (useCustomTemplate) {
          [gitRemote, gitBranch] = await promptValidRemoteAndBranch();
        }
      } else {
        [gitRemote, gitBranch] = await promptValidRemoteAndBranch();
      }
    } else {
      [gitRemote, gitBranch] = await promptValidRemoteAndBranch();
    }

    let projectPath;
    cli.action.start('Cloning project');
    try {
      if (selectedTemplate) {
        projectPath = await cloneProjectTemplate(location, project.name, selectedTemplate);
      } else if (useCustomTemplate) {
        projectPath = await cloneProjectGit(location, project.name, gitRemote, gitBranch);
      } else {
        throw new Error('Invalid initalization state, must select either a template project or provide a git remote');
      }
      cli.action.stop();
    } catch (e) {
      cli.action.stop();
      this.error(e);
    }

    const [
      defaultSpecVersion,
      defaultRepository,
      defaultEndpoint,
      defaultAuthor,
      defaultVersion,
      defaultDescription,
      defaultLicense,
    ] = await readDefaults(projectPath);

    // Update specVersion to template specVersion on custom template
    if (useCustomTemplate) {
      flags.specVersion = defaultSpecVersion;
    }

    project.endpoint = await cli.prompt('RPC endpoint:', {
      default: defaultEndpoint ?? 'wss://polkadot.api.onfinality.io/public-ws',
      required: true,
    });

    project.repository = await cli.prompt('Git repository', {required: false, default: defaultRepository});

    if (flags.specVersion === '0.2.0') {
      cli.action.start('Fetching network genesis hash');
      (project as ProjectSpecV0_2_0).genesisHash = await getGenesisHash(project.endpoint);
      cli.action.stop();
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

    project.version = await cli.prompt('Version', {required: true, default: defaultVersion});
    project.license = await cli.prompt('License', {required: true, default: defaultLicense});

    cli.action.start('Preparing project');
    await prepare(projectPath, project);
    cli.action.stop();
    if (flags['install-dependencies']) {
      cli.action.start('Installing dependencies');
      installDependencies(projectPath, flags.npm);
      cli.action.stop();
    }

    this.log(`${project.name} is ready`);
    process.exit(0);
  }
}
