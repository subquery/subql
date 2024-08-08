// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {search} from '@inquirer/prompts';
import {Command, Flags} from '@oclif/core';
import fuzzy from 'fuzzy';
import {BASE_PROJECT_URL, ROOT_API_URL_PROD} from '../../constants';
import {createProject} from '../../controller/project-controller';
import {checkToken, valueOrPrompt} from '../../utils';

export type CreateProjectType = 'subquery' | 'subgraph';
// Helper function for fuzzy search on prompt input
function filterInput<T>(arr: T[]) {
  return (input: string | undefined, opt: {signal: any}): Promise<ReadonlyArray<{value: T}>> => {
    input ??= '';
    return Promise.resolve(fuzzy.filter(input, arr).map((r) => ({value: r.original})));
  };
}

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
    dedicatedDB: Flags.string({description: 'Enter dedicated DataBase', required: false}),
    projectType: Flags.string({description: 'Enter project type [subquery|subgraph]', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Create_project);

    let {gitRepo, org, projectName, projectType} = flags;
    const authToken = await checkToken();

    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    projectName = await valueOrPrompt(projectName, 'Enter project name', 'Project name is required');
    gitRepo = await valueOrPrompt(gitRepo, 'Enter git repository', 'Git repository is required');

    if (!projectType) {
      projectType = await search<CreateProjectType>({
        message: 'Select a project type',
        source: filterInput(['subquery', 'subgraph']),
      });
    }
    assert(projectType === 'subquery' || projectType === 'subgraph', 'Invalid project type');

    const result = await createProject(
      org,
      flags.subtitle,
      flags.logoURL,
      projectType === 'subquery' ? 1 : 3,
      projectName,
      authToken,
      gitRepo,
      flags.description,
      flags.apiVersion,
      flags.dedicatedDB,
      ROOT_API_URL_PROD
    ).catch((e) => this.error(e));

    const [account, name] = result.key.split('/');
    this.log(`Successfully created project: ${result.key}
    \nProject Url: ${BASE_PROJECT_URL}/orgs/${account}/projects/${name}/deployments`);
  }
}
