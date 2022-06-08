// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {DEFAULT_DEPLOYMENT_TYPE, DEFAULT_DICT_ENDPOINT, DEFAULT_ENDPOINT, INDEXER_V, QUERY_V} from '@subql/common';
import cli from 'cli-ux';
import * as inquirer from 'inquirer';
import {deleteDeployment, deployToHostedService, promoteDeployment} from '../../controller/deploy-controller';

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
    let authToken: string;
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

      if (process.env.SUBQL_ACCESS_TOKEN) {
        authToken = process.env.SUBQL_ACCESS_TOKEN;
      } else if (existsSync(ACCESS_TOKEN_PATH)) {
        try {
          authToken = process.env.SUBQL_ACCESS_TOKEN ?? readFileSync(ACCESS_TOKEN_PATH, 'utf8');
        } catch (e) {
          authToken = await cli.prompt('Token cannot be found, Enter token');
        }
      } else {
        authToken = await cli.prompt('Enter token');
      }

      if (userOptions !== 'deploy') {
        keyInput = await cli.prompt('Enter project key e.g. subquery/hello-world');
        // token = await cli.prompt('Enter token');
        deploymentID = await cli.prompt('Enter deployment ID');
        const handler = optionMapping[userOptions];
        const apiCall = await handler(keyInput, authToken, deploymentID);
        this.log(`${apiCall}`);
      } else {
        keyInput = await cli.prompt('Enter project key e.g. subquery/hello-world');
        // token = await cli.prompt('Enter token');
        ipfsCID = await cli.prompt('Enter IPFS CID');

        // replace default value later
        indexerImageVersion = await cli.prompt('Enter indexer image version', {default: INDEXER_V});
        queryImageVersion = await cli.prompt('Enter query image version', {default: QUERY_V});
        endpoint = await cli.prompt('Enter endpoint', {default: DEFAULT_ENDPOINT});
        type = await cli.prompt('Enter type', {default: DEFAULT_DEPLOYMENT_TYPE});
        dictEndpoint = await cli.prompt('Enter dict endpoint', {
          default: DEFAULT_DICT_ENDPOINT,
        });

        // need to check if ipfsCID exists using validate post
        // https://api.thechaindata.com/doc/#/default/IpfsController_exists
        // https://api.thechaindata.com/doc/#/default/IpfsController_validateManifest

        const handler = optionMapping[userOptions];
        const apiCall = await handler(
          keyInput,
          authToken,
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
