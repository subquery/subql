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
  getEndpoints,
  getDictEndpoints,
  getImage_v,
  processEndpoints,
} from '../../controller/deploy-controller';
import {checkToken, promptWithDefaultValues, valueOrPrompt} from '../../utils';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');
export default class Deploy extends Command {
  static description = 'Deployment to hosted service';

  static flags = {
    org: Flags.string({description: 'Enter organization name'}),
    projectName: Flags.string({description: 'Enter project name'}),
    ipfsCID: Flags.string({description: 'Enter IPFS CID'}),

    type: Flags.enum({options: ['stage', 'primary'], default: DEFAULT_DEPLOYMENT_TYPE, required: false}),
    indexerVersion: Flags.string({description: 'Enter indexer-version', required: false}),
    queryVersion: Flags.string({description: 'Enter query-version', required: false}),
    dict: Flags.string({description: 'Enter dictionary', required: false}),
    endpoint: Flags.string({description: 'Enter endpoint', required: false}),

    useDefaults: Flags.boolean({
      char: 'd',
      description: 'Use default values for indexerVerion, queryVersion, dictionary, endpoint',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy);
    let {dict, endpoint, indexerVersion, ipfsCID, org, projectName, queryVersion} = flags;

    const authToken = await checkToken(process.env.SUBQL_ACCESS_TOKEN, ACCESS_TOKEN_PATH);

    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    projectName = await valueOrPrompt(projectName, 'Enter project name', 'Project name is required');
    ipfsCID = await valueOrPrompt(ipfsCID, 'Enter IPFS CID', 'IPFS CID is required');

    const validator = await ipfsCID_validate(ipfsCID, authToken, ROOT_API_URL_PROD);

    if (!validator.valid) {
      throw new Error(chalk.bgRedBright('Invalid IPFS CID'));
    }

    if (!endpoint) {
      const defaultEndpoints = await getEndpoints(ROOT_API_URL_PROD);
      const validateEndpoint = processEndpoints(defaultEndpoints, validator.chainId);
      if (!flags.useDefaults && !validateEndpoint) {
        endpoint = await promptWithDefaultValues(true, cli, 'Enter endpoint', validateEndpoint);
      } else {
        endpoint = validateEndpoint;
      }
    }

    if (!dict) {
      const defaultDict = await getDictEndpoints(ROOT_API_URL_PROD);
      const validateDictEndpoint = processEndpoints(defaultDict, validator.chainId);
      if (!flags.useDefaults && !validateDictEndpoint) {
        dict = await promptWithDefaultValues(false, cli, 'Enter dictionary', validateDictEndpoint);
      } else {
        dict = validateDictEndpoint;
      }
    }

    if (!indexerVersion) {
      try {
        const indexerVersions = await getImage_v(
          validator.manifestRunner.node.name,
          validator.manifestRunner.node.version,
          authToken,
          ROOT_API_URL_PROD
        );
        if (!flags.useDefaults) {
          const response = await promptWithDefaultValues(
            true,
            inquirer,
            'Enter indexer version',
            null,
            indexerVersions
          );
          indexerVersion = response;
        } else {
          indexerVersion = indexerVersions[0];
        }
      } catch (e) {
        throw new Error(chalk.bgRedBright('Indexer version is required'));
      }
    }
    if (!queryVersion) {
      try {
        const queryVersions = await getImage_v(
          validator.manifestRunner.query.name,
          validator.manifestRunner.query.version,
          authToken,
          ROOT_API_URL_PROD
        );
        if (!flags.useDefaults) {
          const response = await promptWithDefaultValues(true, inquirer, 'Enter query version', null, queryVersions);
          queryVersion = response;
        } else {
          queryVersion = queryVersions[0];
        }
      } catch (e) {
        throw new Error(chalk.bgRedBright('Indexer version is required'));
      }
    }

    this.log('Deploying SupQuery project to Hosted Service');
    console.log(endpoint);

    const deployment_output = await deployToHostedService(
      org,
      projectName,
      authToken,
      ipfsCID,
      indexerVersion,
      queryVersion,
      endpoint,
      flags.type,
      dict,
      ROOT_API_URL_PROD
    ).catch((e) => this.error(e));
    this.log(`Project: ${deployment_output.projectKey}
    \nStatus: ${chalk.blue(deployment_output.status)} 
    \nDeploymentID: ${deployment_output.id}
    \nDeployment Type: ${deployment_output.type}
    \nIndexer version: ${indexerVersion}
    \nQuery version: ${queryVersion}
    \nEndpoint: ${deployment_output.endpoint}
    \nDictionary Endpoint: ${deployment_output.dictEndpoint}
    \nQuery URL: ${deployment_output.queryUrl}
    \nProject URL: ${BASE_PROJECT_URL}/project/${deployment_output.projectKey}
    `);
  }
}
