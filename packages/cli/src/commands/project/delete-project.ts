// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {valueOrPrompt} from '@subql/common';
import cli from 'cli-ux';
import {deleteProject} from '../../controller/project-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Delete_project extends Command {
  static description = 'Delete Project on Hosted Service';

  static flags = {
    org: Flags.string({description: 'Enter organization name'}),
    project_name: Flags.string({description: 'Enter project name'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Delete_project);
    let authToken: string;
    let project_name: string = flags.project_name;
    let org_input: string = flags.org;

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
    org_input = await valueOrPrompt(org_input, 'Enter organisation', 'Organisation is required');
    project_name = await valueOrPrompt(project_name, 'Enter project name', 'Project name is required');

    const deleteStatus = await deleteProject(authToken, org_input, project_name).catch((e) => this.error(e));
    this.log(`Project: ${deleteStatus} has been deleted`);
  }
}
