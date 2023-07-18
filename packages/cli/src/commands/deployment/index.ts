// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Command, Flags} from '@oclif/core';
import * as inquirer from 'inquirer';
import Delete from './delete';
import Deploy from './deploy';
import Promote from './promote';

type DeploymentOption = 'promote' | 'delete' | 'deploy';

export default class Deployment extends Command {
  static description = 'Deploy to hosted service';
  static flags = {
    options: Flags.string({
      options: ['deploy', 'promote', 'delete'],
    }),
    ...Deploy.flags,
    ...Promote.flags,
    ...Delete.flags,
  };
  static optionMapping = {
    deploy: Deploy,
    promote: Promote,
    delete: Delete,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Deployment);
    const option = flags.options;
    let userOptions: DeploymentOption;

    if (!option) {
      const response = await inquirer.prompt([
        {
          name: 'deploymentOptions',
          message: 'Select an deployment option',
          type: 'list',
          choices: [{name: 'deploy'}, {name: 'promote'}, {name: 'delete'}],
        },
      ]);

      userOptions = response.deploymentOptions;
    } else {
      userOptions = option as DeploymentOption;
    }
    this.log(`Selected deployment option: ${userOptions}`);
    try {
      const handler = Deployment.optionMapping[userOptions];
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
