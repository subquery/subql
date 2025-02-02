// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Command, Flags} from '@oclif/core';
import {BASE_PROJECT_URL, ROOT_API_URL_PROD} from '../../constants';
import {createProject} from '../../controller/project-controller';
import {checkToken, valueOrPrompt} from '../../utils';

export default class Create_project extends Command {
  static description = 'Create Project on Hosted Service';

  static flags = {
    org: Flags.string({description: 'Enter organization name'}),
    projectName: Flags.string({description: 'Enter project name'}),
    logoURL: Flags.string({description: 'Enter logo URL', default: '', required: false}),
    subtitle: Flags.string({description: 'Enter subtitle', default: '', required: false}),
    description: Flags.string({description: 'Enter description', default: '', required: false}),
    dedicatedDB: Flags.string({description: 'Enter dedicated DataBase', required: false}),
    projectType: Flags.string({
      description: 'Enter project type [subquery|subgraph]',
      default: 'subquery',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Create_project);

    let {org, projectName} = flags;
    assert(
      ['subquery'].includes(flags.projectType),
      'Invalid project type, only "subquery" is supported. Please deploy Subgraphs through the website.'
    );
    const authToken = await checkToken();

    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    projectName = await valueOrPrompt(projectName, 'Enter project name', 'Project name is required');

    const result = await createProject(ROOT_API_URL_PROD, authToken, {
      apiVersion: 'v3',
      description: flags.description,
      key: `${org}/${projectName}`,
      logoUrl: flags.logoURL,
      name: projectName,
      subtitle: flags.subtitle,
      dedicateDBKey: flags.dedicatedDB,
      tag: [],
      type: flags.projectType === 'subquery' ? 1 : 3,
    }).catch((e) => this.error(e));

    const [account, name] = result.key.split('/');
    this.log(`Successfully created project: ${result.key}
    \nProject Url: ${BASE_PROJECT_URL}/orgs/${account}/projects/${name}/deployments`);
  }
}
