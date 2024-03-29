// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Command, Flags} from '@oclif/core';
import {ROOT_API_URL_PROD} from '../../constants';
import {deleteDeployment} from '../../controller/deploy-controller';
import {checkToken, valueOrPrompt} from '../../utils';

export default class Delete extends Command {
  static description = 'Delete Deployment';

  static flags = {
    org: Flags.string({description: 'Enter organization name'}),
    project_name: Flags.string({description: 'Enter project name'}),
    deploymentID: Flags.string({description: 'Enter deployment ID'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Delete);
    const authToken = await checkToken();
    let deploymentID: number = +flags.deploymentID;
    let project_name: string = flags.project_name;
    let org: string = flags.org;

    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    project_name = await valueOrPrompt(project_name, 'Enter project name', 'Project name is required');
    deploymentID = await valueOrPrompt(deploymentID, 'Enter deployment ID', 'Deployment ID is required');

    this.log(`Removing deployment: ${deploymentID}`);
    const delete_output = await deleteDeployment(org, project_name, authToken, +deploymentID, ROOT_API_URL_PROD).catch(
      (e) => this.error(e)
    );
    this.log(`Removed deployment: ${delete_output}`);
  }
}
