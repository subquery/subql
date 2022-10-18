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
  dictionaryEndpoints,
  imageVersions,
  ipfsCID_validate,
  networkEndpoints,
  processEndpoints,
  projectsInfo,
  redeploy,
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
    //indexer set up flags
    indexer_unsafe: Flags.boolean({description: 'Enable indexer unsafe', required: false}),
    indexer_batchSize: Flags.integer({description: 'Enter batchSize from 1 to 30', required: false}),
    indexer_subscription: Flags.boolean({description: 'Enable Indexer subscription', required: false}),
    indexer_historicalData: Flags.boolean({description: 'Enable Historical Data', required: false}),
    indexer_workers: Flags.integer({description: 'Enter worker threads from 1 to 30', required: false}),
    //query flags
    query_unsafe: Flags.boolean({description: 'Enable indexer unsafe', required: false}),
    query_subscription: Flags.boolean({description: 'Enable Query subscription', required: false}),
    query_timeout: Flags.integer({description: 'Enter timeout from 1000ms to 60000ms', required: false}),
    query_maxConnection: Flags.integer({description: 'Enter MaxConnection from 1 to 10', required: false}),
    query_aggregate: Flags.boolean({description: 'Enable Aggregate', required: false}),

    useDefaults: Flags.boolean({
      char: 'd',
      description: 'Use default values for indexerVersion, queryVersion, dictionary, endpoint',
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
      const validateEndpoint = processEndpoints(await networkEndpoints(ROOT_API_URL_PROD), validator.chainId);
      if (!flags.useDefaults) {
        endpoint = await promptWithDefaultValues(cli, 'Enter endpoint', validateEndpoint, null, true);
      } else if (validateEndpoint) {
        endpoint = validateEndpoint;
      } else {
        throw new Error(chalk.red('Please use --endpoint flag when using a custom Endpoint'));
      }
    }

    const queryAD = {
      unsafe: flags.query_unsafe,
      subscription: flags.query_subscription,
      queryTimeout: flags.query_timeout,
      maxConnection: flags.query_maxConnection,
      Aggregate: flags.query_aggregate,
    };
    const indexerAD = {
      unsafe: flags.indexer_unsafe,
      batchSize: flags.indexer_batchSize,
      subscription: flags.indexer_subscription,
      historicalData: flags.indexer_historicalData,
      workers: flags.indexer_workers,
    };

    if (!dict) {
      const validateDictEndpoint = processEndpoints(await dictionaryEndpoints(ROOT_API_URL_PROD), validator.chainId);
      if (!flags.useDefaults && !validateDictEndpoint) {
        dict = await promptWithDefaultValues(cli, 'Enter dictionary', validateDictEndpoint, null, false);
      } else {
        dict = validateDictEndpoint;
      }
    }

    if (!indexerVersion) {
      try {
        const indexerVersions = await imageVersions(
          validator.manifestRunner.node.name,
          validator.manifestRunner.node.version,
          authToken,
          ROOT_API_URL_PROD
        );
        if (!flags.useDefaults) {
          const response = await promptWithDefaultValues(
            inquirer,
            'Enter indexer version',
            null,
            indexerVersions,
            true
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
        const queryVersions = await imageVersions(
          validator.manifestRunner.query.name,
          validator.manifestRunner.query.version,
          authToken,
          ROOT_API_URL_PROD
        );
        if (!flags.useDefaults) {
          const response = await promptWithDefaultValues(inquirer, 'Enter query version', null, queryVersions, true);
          queryVersion = response;
        } else {
          queryVersion = queryVersions[0];
        }
      } catch (e) {
        throw new Error(chalk.bgRedBright('Indexer version is required'));
      }
    }

    const projectInfo = await projectsInfo(authToken, org, projectName, ROOT_API_URL_PROD, flags.type);

    if (projectInfo !== undefined) {
      await redeploy(
        org,
        projectName,
        projectInfo.id,
        authToken,
        ipfsCID,
        endpoint,
        dict,
        indexerVersion,
        queryVersion,
        queryAD,
        indexerAD,
        ROOT_API_URL_PROD
      );
      this.log(`Project: ${projectName} has been re-deployed`);
    } else {
      this.log('Deploying SubQuery project to Hosted Service');
      const deploymentOutput = await deployToHostedService(
        org,
        projectName,
        authToken,
        ipfsCID,
        indexerVersion,
        queryVersion,
        endpoint,
        flags.type,
        dict,
        queryAD,
        indexerAD,
        ROOT_API_URL_PROD
      ).catch((e) => this.error(e));
      this.log(`Project: ${deploymentOutput.projectKey}
      \nStatus: ${chalk.blue(deploymentOutput.status)}
      \nDeploymentID: ${deploymentOutput.id}
      \nDeployment Type: ${deploymentOutput.type}
      \nIndexer version: ${deploymentOutput.indexerImage}
      \nQuery version: ${deploymentOutput.queryImage}
      \nEndpoint: ${deploymentOutput.endpoint}
      \nDictionary Endpoint: ${deploymentOutput.dictEndpoint}
      \nQuery URL: ${deploymentOutput.queryUrl}
      \nProject URL: ${BASE_PROJECT_URL}/project/${deploymentOutput.projectKey}
      \nAdvance Setting of Indexer: ${deploymentOutput.configuration.config.indexer}
      \nAdvance Setting of Query: ${deploymentOutput.configuration.config.query}
      `);
    }
  }
}
