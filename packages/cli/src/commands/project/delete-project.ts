// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {ROOT_API_URL_PROD} from '../../constants';
import {deleteProject} from '../../controller/project-controller';
import {checkToken, valueOrPrompt} from '../../utils';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Delete_project extends Command {
  static description = 'Delete Project on Hosted Service';

  static flags = {
    org: Flags.string({description: 'Enter organization name'}),
    project_name: Flags.string({description: 'Enter project name'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Delete_project);
    const authToken = await checkToken(process.env.SUBQL_ACCESS_TOKEN, ACCESS_TOKEN_PATH);
    let project_name: string = flags.project_name;
    let org_input: string = flags.org;

    org_input = await valueOrPrompt(org_input, 'Enter organisation', 'Organisation is required');
    project_name = await valueOrPrompt(project_name, 'Enter project name', 'Project name is required');

    const deleteStatus = await deleteProject(authToken, org_input, project_name, ROOT_API_URL_PROD).catch((e) =>
      this.error(e)
    );
    this.log(`Project: ${deleteStatus} has been deleted`);
  }
}
