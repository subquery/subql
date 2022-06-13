// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {DEFAULT_DEPLOYMENT_TYPE} from '@subql/common';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as inquirer from 'inquirer';
import {
  deleteDeployment,
  deployToHostedService,
  getDictEndpoint,
  getEndpoint,
  getImage_v,
  ipfsCID_validate,
  promoteDeployment,
} from '../../controller/deploy-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

type DeploymentOption = 'promote' | 'delete' | 'deploy';

export default class Deploy extends Command {
  static description = 'Deployment to hosted service';
  static flags = {
    options: Flags.string({
      options: ['deploy', 'promote', 'delete'],
    }),
  };
  static optionMapping = {
    deploy: deployToHostedService,
    promote: promoteDeployment,
    delete: deleteDeployment,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy);
    const option = flags.options;

    let org: string;
    let project_name: string;
    let authToken: string;
    let deploymentID: number;

    let ipfsCID: string;
    let indexer_v: string;
    let query_v: string;
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
        authToken = await cli.prompt('Token cannot be found, Enter token');
      }

      if (userOptions === 'delete' || userOptions === 'promote') {
        org = await cli.prompt('Enter organization name');
        project_name = await cli.prompt('Enter project name');
        deploymentID = await cli.prompt('Enter deployment ID');

        const handler = Deploy.optionMapping[userOptions];
        const apiCall = await handler(org, project_name, authToken, deploymentID);
        this.log(`${userOptions}d deployment: ${apiCall}`);
      } else {
        org = await cli.prompt('Enter organization name');
        project_name = await cli.prompt('Enter project name');
        ipfsCID = await cli.prompt('Enter IPFS CID');

        const validator = await ipfsCID_validate(ipfsCID, authToken);

        if (!validator) {
          throw new Error(chalk.bgRedBright('Invalid IPFS CID'));
        }

        const indexer_res = await inquirer.prompt({
          name: 'indexer_version',
          message: 'Enter indexer version',
          type: 'list',
          choices: await getImage_v(validator.runner.node.name, validator.runner.node.version, authToken),
        });
        indexer_v = indexer_res.indexer_version;

        const query_res = await inquirer.prompt({
          name: 'query_version',
          message: 'Enter indexer version',
          type: 'list',
          choices: await getImage_v(validator.runner.query.name, validator.runner.query.version, authToken),
        });
        query_v = query_res.query_version;

        endpoint = await cli.prompt('Enter endpoint', {default: await getEndpoint(validator.chainId), required: false});
        dictEndpoint = await cli.prompt('Enter dictionary', {
          default: await getDictEndpoint(validator.chainId),
          required: false,
        });

        type = await cli.prompt('Enter type', {default: DEFAULT_DEPLOYMENT_TYPE, required: false});

        const handler = Deploy.optionMapping[userOptions];
        const deployment_output = await handler(
          org,
          project_name,
          authToken,
          ipfsCID,
          indexer_v,
          query_v,
          endpoint,
          type,
          dictEndpoint
        );
        this.log(`Project: ${deployment_output.projectKey}
        \nStatus: ${chalk.blue(deployment_output.status)}
        \nDeploymentID: ${deployment_output.id}
        \nDeployment Type: ${deployment_output.type}
        \nEndpoint: ${deployment_output.endpoint}
        \nDictionary Endpoint: ${deployment_output.dictEndpoint}
        `);
      }
    }
  }
}
