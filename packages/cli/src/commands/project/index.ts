// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import cli from 'cli-ux';
import * as inquirer from 'inquirer';
import {createProject, deleteProject} from '../../controller/project-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

type projectOptions = 'create' | 'delete';

const optionMapping = {
  create: createProject,
  delete: deleteProject,
};

export default class Project extends Command {
  static description = 'Create/Delete project';
  static flags = {
    options: Flags.string({
      options: ['create', 'delete'],
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Project);
    const option = flags.options;

    let org: string;
    let project_name: string;
    let authToken: string;
    let gitRepository: string;

    let logoURL: string;
    let subtitle: string;
    let description: string;
    let apiVersion: string;

    if (!option) {
      const response = await inquirer.prompt([
        {
          name: 'projectOption',
          message: 'Select an project option',
          type: 'list',
          choices: [{name: 'create'}, {name: 'delete'}],
        },
      ]);

      const userOptions: projectOptions = response.projectOption;

      this.log(`Selected project option: ${userOptions}`);

      if (process.env.SUBQL_ACCESS_TOKEN) {
        authToken = process.env.SUBQL_ACCESS_TOKEN;
      } else if (existsSync(ACCESS_TOKEN_PATH)) {
        try {
          authToken = process.env.SUBQL_ACCESS_TOKEN ?? readFileSync(ACCESS_TOKEN_PATH, 'utf8');
        } catch (e) {
          authToken = await cli.prompt('Token cannot be found, Enter token');
        }
      } else {
        authToken = await cli.prompt('Enter token');
      }

      if (userOptions === 'create') {
        // required fields
        org = await cli.prompt('Enter organization name');

        subtitle = await cli.prompt('Enter subtitle', {default: '', required: false});
        logoURL = await cli.prompt('Enter logo URL', {default: '', required: false});
        project_name = await cli.prompt('Enter project name');
        if (!authToken) {
          authToken = await cli.prompt('Enter token');
        }
        gitRepository = await cli.prompt('Enter git repository', {
          default: 'https://github.com/subquery/subql-starter',
        });
        description = await cli.prompt('Enter description', {default: '', required: false});
        apiVersion = await cli.prompt('Enter API version', {default: '2', required: false});
        const handler = optionMapping[userOptions];
        const create_output = await handler(
          org,
          subtitle,
          logoURL,
          project_name,
          authToken,
          gitRepository,
          description,
          apiVersion
        );
        this.log(`Project key: ${create_output}`);
      } else {
        org = await cli.prompt('Enter organization name');
        project_name = await cli.prompt('Enter project name');
        const handler = optionMapping[userOptions];
        const delete_output = await handler(authToken, org, project_name);
        this.log(`Project: ${delete_output} has been deleted`);
      }
    }
  }
}
