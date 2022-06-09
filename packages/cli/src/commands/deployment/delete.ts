// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import cli from 'cli-ux';
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
    let authToken: string;
    let deploymentID: number = +flags.deploymentID;
    let project_name: string = flags.project_name;
    let org: string = flags.org;

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

    if (!org) {
      try {
        org = await cli.prompt('Enter organisation');
      } catch (e) {
        throw new Error('Project name and organisation is required');
      }
    }

    if (!project_name) {
      try {
        project_name = await cli.prompt('Enter project name');
      } catch (e) {
        throw new Error('Project name is required');
      }
    }

    if (!flags.deploymentID) {
      try {
        deploymentID = await cli.prompt('Enter deployment ID');
      } catch (e) {
        throw new Error('Deployment ID is required');
      }
    }

    this.log(`Removing deployment: ${deploymentID}`);
    const delete_output = await deleteDeployment(org, project_name, authToken, +deploymentID).catch((e) =>
      this.error(e)
    );
    this.log(`Removed deployment: ${delete_output}`);
  }
}
