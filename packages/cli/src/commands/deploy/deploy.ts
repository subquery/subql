// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import chalk from 'chalk';
import cli from 'cli-ux';
import inquirer from 'inquirer';
import {BASE_PROJECT_URL, DEFAULT_DEPLOYMENT_TYPE, ROOT_API_URL_PROD} from '../../constants';
import {
  deployToHostedService,
  ipfsCID_validate,
  getEndpoint,
  getDictEndpoint,
  getImage_v,
} from '../../controller/deploy-controller';
import {checkToken, valueOrPrompt} from '../../utils';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Deploy extends Command {
  static description = 'Deployment to hosted service';

  static flags = {
    org: Flags.string({description: 'Enter github organization name'}),
    projectName: Flags.string({description: 'Enter project name'}),
    ipfsCID: Flags.string({description: 'Enter IPFS CID'}),

    type: Flags.string({description: 'Enter deployment type', default: DEFAULT_DEPLOYMENT_TYPE, required: false}),
    indexerVersion: Flags.string({description: 'Enter indexer-version', required: false}),
    queryVersion: Flags.string({description: 'Enter query-version', required: false}),
    dict: Flags.string({description: 'Enter dictionary endpoint', required: false}),
    endpoint: Flags.string({description: 'Enter endpoint', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy);

    const authToken = await checkToken(process.env.SUBQL_ACCESS_TOKEN, ACCESS_TOKEN_PATH);
    let ipfsCID: string = flags.ipfsCID;
    let org: string = flags.org;
    let project_name: string = flags.projectName;

    let endpoint: string = flags.endpoint;
    let dict: string = flags.dict;
    let indexer_v = flags.indexerVersion;
    let query_v = flags.queryVersion;

    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    project_name = await valueOrPrompt(project_name, 'Enter project name', 'Project name is required');
    ipfsCID = await valueOrPrompt(ipfsCID, 'Enter IPFS CID', 'IPFS CID is required');

    const validator = await ipfsCID_validate(ipfsCID, authToken, ROOT_API_URL_PROD);

    if (!validator.valid) {
      throw new Error(chalk.bgRedBright('Invalid IPFS CID'));
    }

    if (!endpoint) {
      endpoint = await cli.prompt('Enter endpoint', {
        default: await getEndpoint(validator.chainId, ROOT_API_URL_PROD),
        required: false,
      });
    }

    if (!dict) {
      dict = await cli.prompt('Enter dictionary', {
        default: await getDictEndpoint(validator.chainId, ROOT_API_URL_PROD),
        required: false,
      });
    }

    if (!indexer_v) {
      try {
        const indexerVersions = await getImage_v(
          validator.manifestRunner.node.name,
          validator.manifestRunner.node.version,
          authToken,
          ROOT_API_URL_PROD
        );
        const response = await inquirer.prompt({
          name: 'indexer_v',
          message: 'Select indexer version',
          type: 'list',
          choices: indexerVersions,
        });
        indexer_v = response.indexer_v;
      } catch (e) {
        throw new Error(chalk.bgRedBright('Indexer version is required'));
      }
    }
    if (!query_v) {
      try {
        const queryVersions = await getImage_v(
          validator.manifestRunner.query.name,
          validator.manifestRunner.query.version,
          authToken,
          ROOT_API_URL_PROD
        );
        const response = await inquirer.prompt({
          name: 'query_v',
          message: 'Select Query version',
          type: 'list',
          choices: queryVersions,
        });
        query_v = response.query_v;
      } catch (e) {
        throw new Error(chalk.bgRedBright('Indexer version is required'));
      }
    }

    this.log('Deploying SupQuery project to Hosted Service');
    const deployment_output = await deployToHostedService(
      org,
      project_name,
      authToken,
      ipfsCID,
      indexer_v,
      query_v,
      endpoint,
      flags.type,
      dict,
      ROOT_API_URL_PROD
    ).catch((e) => this.error(e));
    this.log(`Project: ${deployment_output.projectKey}
    \nStatus: ${chalk.blue(deployment_output.status)} 
    \nDeploymentID: ${deployment_output.id}
    \nDeployment Type: ${deployment_output.type}
    \nEndpoint: ${deployment_output.endpoint}
    \nDictionary Endpoint: ${deployment_output.dictEndpoint}
    \nQuery URL: ${deployment_output.queryUrl}
    \nProject URL: ${BASE_PROJECT_URL}/project/${deployment_output.projectKey}
    `);
  }
}
