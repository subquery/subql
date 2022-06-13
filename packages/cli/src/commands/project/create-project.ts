// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {checkToken, valueOrPrompt} from '@subql/common';
import {createProject} from '../../controller/project-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Create_project extends Command {
  static description = 'Create Project on Hosted Service';

  static flags = {
    // required values
    org: Flags.string({description: 'Enter organization name'}),
    project_name: Flags.string({description: 'Enter project name'}),
    gitRepo: Flags.string({description: 'Enter git repository'}),

    // optional values
    logoURL: Flags.string({description: 'Enter logo URL', default: '', required: false}),
    subtitle: Flags.string({description: 'Enter subtitle', default: '', required: false}),
    description: Flags.string({description: 'Enter description', default: '', required: false}),
    apiVersion: Flags.string({description: 'Enter api version', default: '2', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Create_project);
    const authToken = await checkToken(process.env.SUBQL_ACCESS_TOKEN, ACCESS_TOKEN_PATH);
    let project_name: string = flags.project_name;
    let org_input: string = flags.org;
    let gitRepo_input: string = flags.gitRepo;

    org_input = await valueOrPrompt(org_input, 'Enter organisation', 'Organisation is required');
    project_name = await valueOrPrompt(project_name, 'Enter project name', 'Project name is required');
    gitRepo_input = await valueOrPrompt(gitRepo_input, 'Enter git repository', 'Git repository is required');

    const result = await createProject(
      org_input,
      flags.subtitle,
      flags.logoURL,
      project_name,
      authToken,
      gitRepo_input,
      flags.description,
      flags.apiVersion
    ).catch((e) => this.error(e));
    this.log(`Successfully created project: ${result.key}`);
  }
}
