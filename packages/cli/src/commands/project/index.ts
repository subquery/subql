// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {select} from '@inquirer/prompts';
import {Command, Flags} from '@oclif/core';
import Create_project from './create-project';
import Delete_project from './delete-project';

type projectOptions = 'create' | 'delete';

export default class Project extends Command {
  static description = 'Create/Delete project';
  static flags = {
    options: Flags.string({
      options: ['create', 'delete'],
    }),
    ...Delete_project.flags,
    ...Create_project.flags,
  };
  static optionMapping = {
    create: Create_project,
    delete: Delete_project,
  };
  async run(): Promise<void> {
    const {flags} = await this.parse(Project);
    const option = flags.options;
    let userOptions: projectOptions;

    if (!option) {
      userOptions = await select({
        message: 'Select an project option',
        choices: [{value: 'create'}, {value: 'delete'}],
      });
    } else {
      userOptions = option as projectOptions;
    }
    this.log(`Selected project option: ${userOptions}`);

    try {
      const handler = Project.optionMapping[userOptions];
      // removes arguments -> deployment and everything before it from the process.argv
      const stripped_argv: string[] = process.argv
        .filter((v, idx) => idx > process.argv.indexOf('project') && !v.includes('--options'))
        .reduce((acc, val) => acc.concat(val.split('=')), [] as string[]);

      await handler.run(stripped_argv);
    } catch (e) {
      this.log(`Failed to execute command: ${userOptions} error: ${e}`);
    }
  }
}
