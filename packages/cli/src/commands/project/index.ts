// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Command, Flags} from '@oclif/core';
import * as inquirer from 'inquirer';
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
      const response = await inquirer.prompt([
        {
          name: 'projectOption',
          message: 'Select an project option',
          type: 'list',
          choices: [{name: 'create'}, {name: 'delete'}],
        },
      ]);
      userOptions = response.projectOption;
    } else {
      userOptions = option as projectOptions;
    }
    this.log(`Selected project option: ${userOptions}`);

    try {
      const handler = Project.optionMapping[userOptions];
      // removes arguments -> deployment and everything before it from the process.argv
      const stripped_argv: string[] = process.argv
        .filter((v, idx) => idx > process.argv.indexOf('deployment') && !v.includes('--options'))
        .reduce((acc, val) => acc.concat(val.split('=')), []);

      await handler.run(stripped_argv);
    } catch (e) {
      this.log(`Failed to execute command: ${userOptions} error: ${e}`);
    }
  }
}
