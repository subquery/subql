// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import cli from 'cli-ux';
import {promoteDeployment} from '../../controller/deploy-controller';

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
    let authToken: string;
    let deploymentID: number = +flags.deploymentID;
    let org: string = flags.org;
    let project_name: string = flags.project_name;

    if (process.env.SUBQL_ACCESS_TOKEN) {
      authToken = process.env.SUBQL_ACCESS_TOKEN;
    } else if (existsSync(ACCESS_TOKEN_PATH)) {
      try {
        authToken = process.env.SUBQL_ACCESS_TOKEN ?? readFileSync(ACCESS_TOKEN_PATH, 'utf8');
      } catch (e) {
        authToken = await cli.prompt('Token cannot be found, Enter token');
      }
    } else {
      authToken = await cli.prompt('Token cannot be found, Enter token');
    }

    if (!flags.deploymentID || flags.deploymentID === '') {
      try {
        deploymentID = await cli.prompt('Enter deployment ID');
      } catch (e) {
        throw new Error('Deployment ID is required');
      }
    }
    if (!org || !project_name) {
      try {
        org = await cli.prompt('Enter organisation');
        project_name = await cli.prompt('Enter project name');
      } catch (e) {
        throw new Error('Project organisation is required');
      }
    }

    const promote_output = await promoteDeployment(org, project_name, authToken, +deploymentID).catch((e) =>
      this.error(e)
    );
    this.log(`Promote deployment: ${promote_output} from Stage to Production`);
  }
}
