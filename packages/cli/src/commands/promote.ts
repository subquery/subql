// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {promoteDeployment} from '../controller/promote-deploy-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Promote extends Command {
  static description = 'Delete Deployment';

  static flags = {
    key: Flags.string({description: 'Enter project key', required: true}),
    deploymentID: Flags.string({description: 'Enter deployment ID', required: true}),
    token: Flags.string({description: 'Enter access token', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Promote);
    let authToken: string;
    const deploymentID: number = +flags.deploymentID;

    if (flags.token) {
      authToken = flags.token;
    } else if (process.env.SUBQL_ACCESS_TOKEN) {
      authToken = process.env.SUBQL_ACCESS_TOKEN;
    } else if (existsSync(ACCESS_TOKEN_PATH)) {
      try {
        authToken = process.env.SUBQL_ACCESS_TOKEN ?? readFileSync(ACCESS_TOKEN_PATH, 'utf8');
      } catch (e) {
        throw new Error(`Failed to read SUBQL_ACCESS_TOKEN from ${ACCESS_TOKEN_PATH}: ${e}`);
      }
    } else {
      throw new Error('Please provide SUBQL_ACCESS_TOKEN before deployment');
    }

    if (flags.deploymentID === undefined) {
      throw new Error('Please provide ipfs');
    }
    if (flags.key === undefined) {
      throw new Error('Please provide key');
    }

    this.log(`Promote deployment: ${deploymentID} from Stage to Production`);
    const deleting = await promoteDeployment(flags.key, authToken, deploymentID).catch((e) => this.error(e));
    this.log(`${deleting}`);
  }
}
