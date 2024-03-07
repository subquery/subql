// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Command, Flags} from '@oclif/core';
import chalk from 'chalk';
import cli from 'cli-ux';
import inquirer from 'inquirer';
import {BASE_PROJECT_URL, DEFAULT_DEPLOYMENT_TYPE, ROOT_API_URL_PROD} from '../../constants';
import {
  createDeployment,
  dictionaryEndpoints,
  imageVersions,
  ipfsCID_validate,
  processEndpoints,
  projectsInfo,
  splitEndpoints,
  updateDeployment,
  default_command_flags,
  generateDeploymentChain,
  generateAdvancedQueryOptions,
  executeProjectDeployment
} from '../../controller/deploy-controller';
import {IndexerAdvancedOpts, QueryAdvancedOpts, V3DeploymentIndexerType, deploymentFlagsInterface} from '../../types';
import {addV, checkToken, promptWithDefaultValues, valueOrPrompt} from '../../utils';

export default class Deploy extends Command {
  static description = 'Deployment to hosted service';

  static flags = Object.assign(default_command_flags(), {
    ipfsCID: Flags.string({description: 'Enter IPFS CID'}),
    endpoint: Flags.string({description: 'Enter endpoint', required: true}),
  });

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy);
    let {dict, endpoint, indexerVersion, ipfsCID, org, projectName, queryVersion} = flags;

    const authToken = await checkToken();

    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    projectName = await valueOrPrompt(projectName, 'Enter project name', 'Project name is required');
    ipfsCID = await valueOrPrompt(ipfsCID, 'Enter IPFS CID', 'IPFS CID is required');

    const validator = await ipfsCID_validate(String(ipfsCID), authToken, ROOT_API_URL_PROD);
    queryVersion = addV(String(queryVersion));
    indexerVersion = addV(String(indexerVersion));

    if (!validator.valid) {
      throw new Error(chalk.bgRedBright('Invalid IPFS CID'));
    }

    if (!endpoint) {
      if (flags.useDefaults) {
        throw new Error(chalk.red('Please ensure a valid is passed using --endpoint flag'));
      }

      endpoint = await promptWithDefaultValues(cli, 'Enter endpoint', undefined, null, true);
    }

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
          indexerVersion = await promptWithDefaultValues(
            inquirer,
            'Enter indexer version',
            null,
            indexerVersions,
            true
          );
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
        throw new Error(chalk.bgRedBright('Query version is required'));
      }
    }
    const projectInfo = await projectsInfo(authToken, String(org), String(projectName), ROOT_API_URL_PROD, String(flags.type));
    const chains: V3DeploymentIndexerType[] = [];
    chains.push(
      generateDeploymentChain({
        cid: String(ipfsCID),
        dictEndpoint: String(dict),
        endpoint: splitEndpoints(String(endpoint)),
        flags: flags as unknown as deploymentFlagsInterface,
        indexerImageVersion: String(indexerVersion)
      })
    );


    this.log('Deploying SubQuery project to Hosted Service');

    let deploymentOutput = await executeProjectDeployment({
      authToken: authToken,
      chains: chains,
      flags: flags as unknown as deploymentFlagsInterface,
      ipfsCID: String(ipfsCID),
      org: String(org),
      projectInfo: projectInfo,
      projectName: String(projectName),
      queryVersion: queryVersion
    });

    if (!deploymentOutput) {
      this.log(`Project: ${projectName} has been re-deployed`);
    } else {
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
      \nAdvanced Settings for Query: ${JSON.stringify(deploymentOutput.configuration.config.query)}
      \nAdvanced Settings for Indexer: ${JSON.stringify(deploymentOutput.configuration.config.indexer)}
      `);
    }





  }
}
