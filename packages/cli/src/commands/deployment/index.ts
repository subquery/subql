// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import cli from 'cli-ux';
import * as inquirer from 'inquirer';
import {deleteDeployment, deployToHostedService, promoteDeployment} from '../../controller/deploy-controller';
// import { ArgInput } from '@oclif/core/lib/interfaces';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

type DeploymentOption = 'promote' | 'delete' | 'deploy';

const optionMapping = {
  deploy: deployToHostedService,
  promote: promoteDeployment,
  delete: deleteDeployment,
};

export default class Deploy extends Command {
  static description = 'Deployment to hosted service';
  static flags = {
    options: Flags.string({
      options: ['deploy', 'promote', 'delete'],
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy);
    const option = flags.options;

    let keyInput: string;
    let tokenInput: string;
    let deploymentID: number;

    let ipfsCID: string;
    let indexerImageVersion: string;
    let queryImageVersion: string;
    let endpoint: string;
    let type: string;
    let dictEndpoint: string;

    if (!option) {
      const response = await inquirer.prompt([
        {
          name: 'deploymentOptions',
          message: 'Select an deployment option',
          type: 'list',
          choices: [{name: 'deploy'}, {name: 'promote'}, {name: 'delete'}],
        },
      ]);

      const userOptions: DeploymentOption = response.deploymentOptions;

      this.log(`Selected deployment option: ${userOptions}`);

      if (userOptions !== 'deploy') {
        keyInput = await cli.prompt('Enter project key e.g. subquery/hello-world');
        tokenInput = await cli.prompt('Enter token');
        deploymentID = await cli.prompt('Enter deployment ID');
        const handler = optionMapping[userOptions];
        const apiCall = await handler(keyInput, tokenInput, deploymentID);
        this.log(`${apiCall}`);
      } else {
        keyInput = await cli.prompt('Enter project key e.g. subquery/hello-world', {required: true});
        tokenInput = await cli.prompt('Enter token', {required: true});
        ipfsCID = await cli.prompt('Enter IPFS CID', {required: true});

        // replace default value later
        indexerImageVersion = await cli.prompt('Enter indexer image version', {default: 'v1.1.2'});
        queryImageVersion = await cli.prompt('Enter query image version', {default: 'v1.1.1'});
        endpoint = await cli.prompt('Enter endpoint', {default: 'wss://polkadot.api.onfinality.io/public-ws'});
        type = await cli.prompt('Enter type', {default: 'primary'});
        dictEndpoint = await cli.prompt('Enter dict endpoint', {
          default: 'https://api.subquery.network/sq/subquery/altair-dictionary',
        });

        const handler = optionMapping[userOptions];
        const apiCall = await handler(
          keyInput,
          tokenInput,
          ipfsCID,
          indexerImageVersion,
          queryImageVersion,
          endpoint,
          type,
          dictEndpoint
        );
        this.log(`${apiCall}`);
      }
    }
  }
}
