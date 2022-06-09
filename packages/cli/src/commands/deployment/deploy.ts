// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {DEFAULT_DEPLOYMENT_TYPE, DEFAULT_DICT_ENDPOINT, DEFAULT_ENDPOINT, INDEXER_V, QUERY_V} from '@subql/common';
import chalk from 'chalk';
import cli from 'cli-ux';
import {deployToHostedService, ipfsCID_validate} from '../../controller/deploy-controller';
import {advancedSettingsType, deploymentDataType} from '../../types';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Deploy extends Command {
  static description = 'Deployment to hosted service';

  static flags = {
    org: Flags.string({description: 'Enter organization name'}),
    project_name: Flags.string({description: 'Enter project name'}),
    ipfsCID: Flags.string({description: 'Enter IPFS CID'}),

    type: Flags.string({description: 'enter type', default: DEFAULT_DEPLOYMENT_TYPE, required: false}),
    dict: Flags.string({description: 'enter dict', default: DEFAULT_DICT_ENDPOINT, required: false}),
    indexerVersion: Flags.string({description: 'enter indexer-version', default: INDEXER_V, required: false}),
    queryVersion: Flags.string({description: 'enter query-version', default: QUERY_V, required: false}),
    endpoint: Flags.string({description: 'enter endpoint', default: DEFAULT_ENDPOINT, required: false}),

    // allowAdvanceSettings: Flags.boolean({char: 'a', description: 'allow advance settings', default: false, required: false}),

    // node_sub: Flags.boolean({description: 'subql/node: subscription', required: false}),
    // node_unsafe: Flags.boolean({description: 'subql/node: unsafe',  required: false}),
    // node_batchSize: Flags.string({description: 'subql/node: batch size', required: false}),

    // query_sub: Flags.boolean({description: 'subql/query: subscription',  required: false}),
    // query_unsafe: Flags.boolean({description: 'subql/query: unsafe',  required: false}),
    // query_batchSize: Flags.string({description: 'subql/query: batch size',  required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy);
    let authToken: string;
    let ipfsCID: string = flags.ipfsCID;
    let org: string = flags.org;
    let project_name: string = flags.project_name;
    // let advancedSettings: advancedSettingsType;
    // const allowAdvanceSettings: boolean = flags.allowAdvanceSettings;
    // let deployment_output: deploymentDataType;

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
    // switch (allowAdvanceSettings) {
    //   case flags.node_sub !== undefined:
    //     advancedSettings['@subql/node'].subscription = flags.node_sub;
    //     console.log(JSON.stringify(advancedSettings, null, 2));
    //     break;
    //   case flags.node_unsafe !== undefined:
    //     advancedSettings['@subql/node'].unsafe = flags.node_unsafe;
    //     break;
    //   case flags.node_batchSize !== undefined:
    //     advancedSettings['@subql/node'].batchSize = +flags.node_batchSize;
    //     break;
    //   case flags.query_sub !== undefined:
    //     advancedSettings['@subql/query'].subscription = flags.query_sub;
    //     break;
    //   case flags.query_unsafe !== undefined:
    //     advancedSettings['@subql/query'].unsafe = flags.query_unsafe;
    //     break;
    //   case flags.query_batchSize !== undefined:
    //     advancedSettings['@subql/query'].batchSize = +flags.query_batchSize;
    //     break;
    //   default:
    //     break;
    // }

    if (!org) {
      try {
        org = await cli.prompt('Enter organization name');
      } catch (e) {
        throw new Error('Please provide org');
      }
    }
    if (!project_name) {
      try {
        project_name = await cli.prompt('Enter project name');
      } catch (e) {
        throw new Error('Please provide name');
      }
    }

    if (!flags.ipfsCID) {
      try {
        ipfsCID = await cli.prompt('Enter IPFS CID');
      } catch (e) {
        throw new Error('Please provide ipfs');
      }
    }
    const validator = await ipfsCID_validate(ipfsCID, authToken);

    if (!validator) {
      throw new Error(chalk.bgRedBright('Invalid IPFS CID'));
    }

    this.log('Deploying SupQuery project to Hosted Service');
    // if (!allowAdvanceSettings ) {
    const deployment_output = await deployToHostedService(
      org,
      project_name,
      authToken,
      ipfsCID,
      flags.indexerVersion,
      flags.queryVersion,
      flags.endpoint,
      flags.type,
      flags.dict
    ).catch((e) => this.error(e));
    // } else {
    //   deployment_output = await deployToHostedService(
    //     org,
    //     project_name,
    //     authToken,
    //     ipfsCID,
    //     flags.indexerVersion,
    //     flags.queryVersion,
    //     flags.endpoint,
    //     flags.type,
    //     flags.dict,
    //     advancedSettings
    //   ).catch((e) => this.error(e));
    // }
    this.log(`Project: ${deployment_output.projectKey}
    \nStatus: ${chalk.bgBlue(deployment_output.status)}
    \nDeploymentID: ${deployment_output.id}
    \nDeployment Type: ${deployment_output.type}
    \nEndpoint: ${deployment_output.endpoint}
    \nDictionary Endpoint: ${deployment_output.dictEndpoint}
    `);
  }
}
