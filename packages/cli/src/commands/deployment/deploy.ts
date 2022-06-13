// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {DEFAULT_DEPLOYMENT_TYPE, valueOrPrompt} from '@subql/common';
import chalk from 'chalk';
import cli from 'cli-ux';
import inquirer from 'inquirer';
import {
  deployToHostedService,
  ipfsCID_validate,
  getEndpoint,
  getDictEndpoint,
  getImage_v,
} from '../../controller/deploy-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Deploy extends Command {
  static description = 'Deployment to hosted service';

  static flags = {
    org: Flags.string({description: 'Enter organization name'}),
    project_name: Flags.string({description: 'Enter project name'}),
    ipfsCID: Flags.string({description: 'Enter IPFS CID'}),

    type: Flags.string({description: 'enter type', default: DEFAULT_DEPLOYMENT_TYPE, required: false}),
    indexerVersion: Flags.string({description: 'enter indexer-version', required: false}),
    queryVersion: Flags.string({description: 'enter query-version', required: false}),
    dict: Flags.string({description: 'enter dict', required: false}),
    endpoint: Flags.string({description: 'enter endpoint', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy);
    let authToken: string;
    let ipfsCID: string = flags.ipfsCID;
    let org: string = flags.org;
    let project_name: string = flags.project_name;

    let endpoint: string = flags.endpoint;
    let dict: string = flags.dict;
    let indexer_v = flags.indexerVersion;
    let query_v = flags.queryVersion;

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

    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    project_name = await valueOrPrompt(project_name, 'Enter project name', 'Project name is required');
    ipfsCID = await valueOrPrompt(ipfsCID, 'Enter IPFS CID', 'IPFS CID is required');

    const validator = await ipfsCID_validate(ipfsCID, authToken);

    if (!validator.valid) {
      throw new Error(chalk.bgRedBright('Invalid IPFS CID'));
    }

    if (!endpoint) {
      const default_endpoint = await getEndpoint(validator.chainId);
      endpoint = await cli.prompt('Enter endpoint', {default: default_endpoint, required: false});
    }

    if (!dict) {
      const default_dict = await getDictEndpoint(validator.chainId);
      dict = await cli.prompt('Enter dictionary', {default: default_dict, required: false});
    }

    if (!indexer_v) {
      try {
        const indexerVersions = await getImage_v(validator.runner.node.name, validator.runner.node.version, authToken);
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
        const queryVersions = await getImage_v(validator.runner.query.name, validator.runner.query.version, authToken);
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
      dict
    ).catch((e) => this.error(e));
    this.log(`Project: ${deployment_output.projectKey}
    \nStatus: ${chalk.blue(deployment_output.status)}
    \nDeploymentID: ${deployment_output.id}
    \nDeployment Type: ${deployment_output.type}
    \nEndpoint: ${deployment_output.endpoint}
    \nDictionary Endpoint: ${deployment_output.dictEndpoint}
    `);
  }
}
