// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {ROOT_API_URL_PROD} from '../../constants';
import {promoteDeployment} from '../../controller/deploy-controller';
import {checkToken, valueOrPrompt} from '../../utils';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Promote extends Command {
  static description = 'Promote Deployment';

  static flags = {
    org: Flags.string({description: 'Enter organization name'}),
    project_name: Flags.string({description: 'Enter project name'}),
    deploymentID: Flags.string({description: 'Enter deployment ID'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Promote);
    const authToken = await checkToken(process.env.SUBQL_ACCESS_TOKEN, ACCESS_TOKEN_PATH);

    let deploymentID: number = +flags.deploymentID;
    let org: string = flags.org;
    let project_name: string = flags.project_name;

    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    project_name = await valueOrPrompt(project_name, 'Enter project name', 'Project name is required');
    deploymentID = await valueOrPrompt(deploymentID, 'Enter deployment ID', 'Deployment ID is required');

    const promote_output = await promoteDeployment(
      org,
      project_name,
      authToken,
      +deploymentID,
      ROOT_API_URL_PROD
    ).catch((e) => this.error(e));
    this.log(`Promote deployment: ${promote_output} from Stage to Production`);
  }
}
