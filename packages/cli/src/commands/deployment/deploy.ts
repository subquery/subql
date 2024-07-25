// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {select, input} from '@inquirer/prompts';
import {Command, Flags} from '@oclif/core';
import chalk from 'chalk';
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
  splitEndpoints,
} from '../../controller/deploy-controller';
import {V3DeploymentIndexerType} from '../../types';
import {addV, checkToken, valueOrPrompt} from '../../utils';

export default class Deploy extends Command {
  static description = 'Deployment to hosted service';

  static flags = {
    ...DefaultDeployFlags,
    ipfsCID: Flags.string({description: 'Enter IPFS CID'}),
    endpoint: Flags.string({description: 'Enter endpoint', required: true}),
  };

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

      flags.endpoint = await input({message: 'Enter endpoint', required: true});
    }

    if (!flags.dict) {
      assert(validator.chainId, 'Please set chainId in your project');
      const validateDictEndpoint = processEndpoints(await dictionaryEndpoints(ROOT_API_URL_PROD), validator.chainId);
      if (!flags.useDefaults && !validateDictEndpoint) {
        flags.dict = await input({message: 'Enter dictionary', default: validateDictEndpoint});
      } else {
        flags.dict = validateDictEndpoint;
      }
    }

    if (!flags.indexerVersion) {
      assert(validator.manifestRunner, 'Please set manifestRunner in your project');
      try {
        flags.indexerVersion = await promptImageVersion(
          validator.manifestRunner.node.name,
          validator.manifestRunner.node.version,
          flags.useDefaults,
          authToken,
          'Enter indexer version'
        );
      } catch (e) {
        throw new Error(chalk.bgRedBright('Indexer version is required'));
      }
    }
    if (!flags.queryVersion) {
      assert(validator.manifestRunner, 'Please set manifestRunner in your project');
      try {
        flags.queryVersion = await promptImageVersion(
          validator.manifestRunner.query.name,
          validator.manifestRunner.query.version,
          flags.useDefaults,
          authToken,
          'Enter query version'
        );
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
        indexerImageVersion: flags.indexerVersion,
      })
    );

    this.log('Deploying SubQuery project to Hosted Service');

    await executeProjectDeployment({
      log: this.log.bind(this),
      authToken,
      chains,
      flags,
      ipfsCID: flags.ipfsCID,
      org: flags.org,
      projectInfo,
      projectName: flags.projectName,
      queryVersion: flags.queryVersion,
    });
  }
}

export async function promptImageVersion(
  runner: string,
  version: string,
  useDefaults: boolean,
  authToken: string,
  message: string
): Promise<string> {
  const versions = await imageVersions(runner, version, authToken, ROOT_API_URL_PROD);
  if (!useDefaults) {
    return select({
      message,
      choices: versions.map((v) => ({value: v})),
    });
  } else {
    return versions[0];
  }
}
