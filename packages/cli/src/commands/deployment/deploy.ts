// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Command, Flags} from '@oclif/core';
import chalk from 'chalk';
import cli from 'cli-ux';
import inquirer from 'inquirer';
import {ROOT_API_URL_PROD} from '../../constants';
import {
  DefaultDeployFlags,
  dictionaryEndpoints,
  executeProjectDeployment,
  generateDeploymentChain,
  imageVersions,
  ipfsCID_validate,
  processEndpoints,
  projectsInfo,
  splitEndpoints
} from '../../controller/deploy-controller';
import {V3DeploymentIndexerType} from '../../types';
import {addV, checkToken, promptWithDefaultValues, valueOrPrompt} from '../../utils';

export default class Deploy extends Command {
  static description = 'Deployment to hosted service';

  static flags = Object.assign(DefaultDeployFlags, {
    ipfsCID: Flags.string({description: 'Enter IPFS CID'}),
    endpoint: Flags.string({description: 'Enter endpoint', required: true}),
  });

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy);

    const authToken = await checkToken();

    flags.org = await valueOrPrompt(flags.org, 'Enter organisation', 'Organisation is required');
    flags.projectName = await valueOrPrompt(flags.projectName, 'Enter project name', 'Project name is required');
    flags.ipfsCID = await valueOrPrompt(flags.ipfsCID, 'Enter IPFS CID', 'IPFS CID is required');

    const validator = await ipfsCID_validate(flags.ipfsCID, authToken, ROOT_API_URL_PROD);
    flags.queryVersion = addV(flags.queryVersion);
    flags.indexerVersion = addV(flags.indexerVersion);

    if (!validator.valid) {
      throw new Error(chalk.bgRedBright('Invalid IPFS CID'));
    }

    if (!flags.endpoint) {
      if (flags.useDefaults) {
        throw new Error(chalk.red('Please ensure a valid is passed using --endpoint flag'));
      }

      flags.endpoint = await promptWithDefaultValues(cli, 'Enter endpoint', undefined, null, true);
    }

    if (!flags.dict) {
      const validateDictEndpoint = processEndpoints(await dictionaryEndpoints(ROOT_API_URL_PROD), validator.chainId);
      if (!flags.useDefaults && !validateDictEndpoint) {
        flags.dict = await promptWithDefaultValues(cli, 'Enter dictionary', validateDictEndpoint, null, false);
      } else {
        flags.dict = validateDictEndpoint;
      }
    }

    if (!flags.indexerVersion) {
      try {
        const indexerVersions = await imageVersions(
          validator.manifestRunner.node.name,
          validator.manifestRunner.node.version,
          authToken,
          ROOT_API_URL_PROD
        );
        if (!flags.useDefaults) {
          flags.indexerVersion = await promptWithDefaultValues(
            inquirer,
            'Enter indexer version',
            null,
            indexerVersions,
            true
          );
        } else {
          flags.indexerVersion = indexerVersions[0];
        }
      } catch (e) {
        throw new Error(chalk.bgRedBright('Indexer version is required'));
      }
    }
    if (!flags.queryVersion) {
      try {
        const queryVersions = await imageVersions(
          validator.manifestRunner.query.name,
          validator.manifestRunner.query.version,
          authToken,
          ROOT_API_URL_PROD
        );
        if (!flags.useDefaults) {
          const response = await promptWithDefaultValues(inquirer, 'Enter query version', null, queryVersions, true);
          flags.queryVersion = response;
        } else {
          flags.queryVersion = queryVersions[0];
        }
      } catch (e) {
        throw new Error(chalk.bgRedBright('Query version is required'));
      }
    }
    const projectInfo = await projectsInfo(authToken, flags.org, flags.projectName, ROOT_API_URL_PROD, flags.type);
    const chains: V3DeploymentIndexerType[] = [];
    chains.push(
      generateDeploymentChain({
        cid: flags.ipfsCID,
        dictEndpoint: flags.dict,
        endpoint: splitEndpoints(flags.endpoint),
        flags: flags,
        indexerImageVersion: flags.indexerVersion
      })
    );


    this.log('Deploying SubQuery project to Hosted Service');

    await executeProjectDeployment({
      log: this.log,
      authToken: authToken,
      chains: chains,
      flags: flags,
      ipfsCID: flags.ipfsCID,
      org: flags.org,
      projectInfo: flags.projectInfo,
      projectName: flags.projectName,
      queryVersion: flags.queryVersion
    });






  }
}
