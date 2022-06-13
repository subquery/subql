// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {checkToken, valueOrPrompt} from '@subql/common';
import {deleteDeployment} from '../../controller/deploy-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Delete extends Command {
  static description = 'Delete Deployment';

  static flags = {
    org: Flags.string({description: 'Enter organization name'}),
    project_name: Flags.string({description: 'Enter project name'}),
    deploymentID: Flags.string({description: 'Enter deployment ID'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Delete);
    const authToken = await checkToken(process.env.SUBQL_ACCESS_TOKEN, ACCESS_TOKEN_PATH);
    let deploymentID: number = +flags.deploymentID;
    let project_name: string = flags.project_name;
    let org: string = flags.org;

    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    project_name = await valueOrPrompt(project_name, 'Enter project name', 'Project name is required');
    deploymentID = await valueOrPrompt(deploymentID, 'Enter deployment ID', 'Deployment ID is required');

    this.log(`Removing deployment: ${deploymentID}`);
    const delete_output = await deleteDeployment(org, project_name, authToken, +deploymentID).catch((e) =>
      this.error(e)
    );
    this.log(`Removed deployment: ${delete_output}`);
  }
}
