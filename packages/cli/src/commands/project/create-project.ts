// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {BASE_PROJECT_URL, ROOT_API_URL_PROD} from '../../constants';
import {createProject} from '../../controller/project-controller';
import {checkToken, valueOrPrompt} from '../../utils';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Create_project extends Command {
  static description = 'Create Project on Hosted Service';

  static flags = {
    org: Flags.string({description: 'Enter organization name'}),
    projectName: Flags.string({description: 'Enter project name'}),
    gitRepo: Flags.string({description: 'Enter git repository'}),

    logoURL: Flags.string({description: 'Enter logo URL', default: '', required: false}),
    subtitle: Flags.string({description: 'Enter subtitle', default: '', required: false}),
    description: Flags.string({description: 'Enter description', default: '', required: false}),
    apiVersion: Flags.string({description: 'Enter api version', default: '2', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Create_project);

    let {gitRepo, org, projectName} = flags;
    const authToken = await checkToken(process.env.SUBQL_ACCESS_TOKEN, ACCESS_TOKEN_PATH);

    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    projectName = await valueOrPrompt(projectName, 'Enter project name', 'Project name is required');
    gitRepo = await valueOrPrompt(gitRepo, 'Enter git repository', 'Git repository is required');

    const result = await createProject(
      org,
      flags.subtitle,
      flags.logoURL,
      projectName,
      authToken,
      gitRepo,
      flags.description,
      flags.apiVersion,
      ROOT_API_URL_PROD
    ).catch((e) => this.error(e));

    this.log(`Successfully created project: ${result.key}
    \nProject Url: ${BASE_PROJECT_URL}/project/${result.key}`);
  }
}
